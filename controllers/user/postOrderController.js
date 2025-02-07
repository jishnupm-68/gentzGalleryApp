const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Address =  require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");
const env = require('dotenv').config();

const decrementSaleCounts = async (cartItemQuantities) => {
    try {
      const bulkOperations = cartItemQuantities.map(item => ({
        updateOne: {
          filter: { _id: item.productId }, 
          update: { $inc: { saleCount: item.quantity , quantity: -item.quantity } },         
        },
      }));
      const result = await Product.bulkWrite(bulkOperations);
      console.log('Bulk decrement result:', result);
      return result;
    } catch (error) {
      console.error('Error decrementing sale counts:', error);
      throw error;
    }
  };

const getOrderDetailsPage = async (req,res)=>{
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        //const addressId = req.session.addressId;
        const addressId  = await Order.findOne({_id:orderId},{address:1,_id:0});
        const aId= addressId.address
        console.log("addressId",addressId.address,aId)
        const addressData = await Address.findOne({"address._id":aId});
        console.log("addressData",addressData)
        const findOrder = await Order.findOne({_id:orderId, userId:userId});
        const findUser = await User.findOne({_id:userId});
        const address =  addressData.address.find(addr =>addr._id.toString()===aId.toString());
        let grandTotal = findOrder.finalAmount;
        let discount = findOrder.discount;
        let totalPrice = grandTotal-discount;
        console.log("FindOrdeR:",findOrder,address);
        res.render("orderDetails",{
            orders: findOrder,
            user: findUser,
            totalGrand: totalPrice,
            grandTotal: grandTotal,
            discount: discount,
            finalAmount : totalPrice,
            address:address,
        })
        console.log(req.session,req.body, req.params,req.query)  
    } catch (error) {
        console.error("error while loading the order details page", error)
        res.redirect('/pageNotFound')   
    }
}

const cancelOrder = async(req,res)=>{
    try {
        console.log(req.body, req.body.productId, req.session.user);
        const {productId, orderId}= req.body;
        const userId = req.session.user;
        
        const findOrder = await Order.findOneAndUpdate(
            {"orderedItems.product":productId, userId:userId, _id:orderId},
            {"orderedItems.$.productStatus":"Cancelled"},
            {new:true}
        )
        const cancelOrder = await Order.findOne(
            {"orderedItems.product":productId, userId:userId, _id:orderId},
            {"orderedItems.$":1},
        )       
        const cancelItemQuantities = cancelOrder.orderedItems.map((item)=>
            ({
                productId:item.product,
                quantity: -item.quantity
            })
            );
            console.log("findCancelled order",findOrder,"cancelItemQuantities",cancelItemQuantities)
            if(findOrder){
                decrementSaleCounts(cancelItemQuantities)
                  .then(result =>                     
                    {console.log('Decrement successful:', result)
                    if (result.modifiedCount === 1) {
                        return res.json({
                            success: true,
                            result, 
                            message: "Order has been successfully cancelled"
                        });
                    } else {
                        return res.json({
                            success: false,
                            result,
                            message: "Order cancellation failed. No changes made."
                        });
                    }}
                    )
                  .catch(error => console.error('Decrement failed:', error));           
            }       
    } catch (error) {
        console.error("Error while cancelling the order",error);
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    getOrderDetailsPage,
    cancelOrder
}