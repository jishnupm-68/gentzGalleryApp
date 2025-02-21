const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart  = require("../../models/cartSchema");
const mongoose = require('mongoose');
const {v4:uuidv4} = require('uuid');
const env = require('dotenv').config();

const decrementSaleCounts = async (cartItemQuantities) => {
    try {
      const bulkOperations = cartItemQuantities.map(item => ({
        updateOne: {
          filter: { _id: item.productId }, 
          update: { $inc: { saleCount: -item.quantity , quantity: item.quantity } }, 
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

const loadOrders = async (req,res)=>{
    try { 
        const itemsPerPage = 3;
        const currentPage = parseInt(req.query.page) || 1;
        const skipItems = (currentPage - 1) * itemsPerPage;
        const [orders, totalOrders] = await Promise.all([
            Order.find({})
                .sort({ createdOn: -1 })
                .skip(skipItems)  
                .limit(itemsPerPage)  
                .lean(),  
            Order.countDocuments()
        ]);
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        console.log("Order", orders,"currentPage",currentPage,"totalPages",totalPages)
        res.render("orderList", {orders:orders, currentPage:currentPage, totalPages:totalPages});       
    } catch (error) {
        console.error("error while rendering the order deatails page",error);
        res.redirect("/admin/pageError");
    }
}

const updateOrderStatus = async (req,res)=>{
    try {
        console.log(req.body)
        const {orderId, productId, status} = req.body;
        let update = await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
            {$set:{"orderedItems.$.productStatus":status}},
            {new:true});
            console.log("updated data",update)      
        if(update.status =="Pending" && update.payment == "cod"){
            await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
                {$set:{status:"Verified"}},
                {new:true});
        }
        if(status=="Cancelled")
            { 
                if(update.payment !== "cod"){
                    const quantity = update.orderedItems[0].quantity;
                    const price =  update.orderedItems[0].price;
                    let amount =  price * quantity;
                    walletUpdate = await User.findOneAndUpdate(
                        { _id: update.userId },
                        { $inc: { wallet: amount } }
                    );
                    if (walletUpdate) {
                        console.log("Wallet updated successfully");
                    }else{
                        console.log("Wallet update failed");
                    }
                }
                  const items = update.orderedItems.map((item)=>
                ({ 
                    productId:item.product,
                    quantity: item.quantity
                })
                );   
                decrementSaleCounts(items)
                .then(result => console.log('Decrement successful:', result))
                .catch(error => console.error('Decrement failed:', error));             
        }
        res.json({ status: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error while updating order status", error);
        res.json({ status: false, message: "Failed to update order status" });
    }
}

const updateReturnStatus = async (req,res)=>{
    try {
        const {orderId, productId, status} = req.body;
        let actualStatus = status==true?"Returned":"Return Request";
        let message = status == true ? "Return request accepted" : "Return request rejected";
        let date = status == true ? Date.now() : null;
        let update = await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
            {$set:
                {
                    "orderedItems.$.productStatus":actualStatus,
                    "orderedItems.$.returnStatus":message,
                    "orderedItems.$.refundDate":date}},
            {new:true});
         const returnItemQuantities = update.orderedItems.map((item)=>
            ({
                productId:item.product,
                quantity: item.quantity
            })
            );
            if(update && status == true){
                let walletUpdate;
                //updating wallet
                {
                    //const quantity = findOrder.orderedItems[0].quantity;
                    //const price =  findOrder.orderedItems[0].price;
                    //let amount =  price * quantity;
                    let amount =  update.finalAmount
                    walletUpdate = await User.findOneAndUpdate({ _id: update.userId }, { $inc: { wallet: amount } });
                    if (walletUpdate) {
                        console.log("Wallet updated successfully");
                    }else{
                        console.log("Wallet update failed");
                    }
                }
                decrementSaleCounts(returnItemQuantities)
                  .then(result =>                     
                    {console.log('Decrement successful:', result)
                    if (result.modifiedCount === 1 && walletUpdate) {
                        return res.json({
                            success: true,
                            result, 
                            message: "Order has been successfully cancelled and amount credited to your wallet"
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
        res.json({ status: true, message: "Return status updated successfully" });
        
    } catch (error) {
        console.error("Error while updating return status", error);
        res.json({ status: false, message: "Failed to update return status" });       
    }
}

const getOrderDetailsPageAdmin = async (req,res)=>{
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        //const addressId = req.session.addressId;
        const [addressId, findOrder, findUser]    = await Promise.all([ 
            Order.findOne({_id:orderId},{address:1,_id:0}),
            Order.findOne({_id:orderId}),
            User.findOne({_id:userId})
        ]);
        const aId= addressId.address
        console.log("addressId",addressId.address,aId,"orderId",orderId)
        const addressData = await Address.findOne({"address._id":aId});
        
        const address =  addressData.address.find(addr =>addr._id.toString()===aId.toString());
        console.log("FindOrdeR:",findOrder,"address",address);
        let grandTotal = findOrder.finalAmount;
        let discount = findOrder.discount;
        let totalPrice = findOrder.totalPrice;
        res.render("orderDetailsAdmin",{
            orders: findOrder,
            user: findUser,
            totalGrand: totalPrice,
            grandTotal: grandTotal,
            discount: discount,
            finalAmount : totalPrice,
            address:address,
            //products: cartItems
        })
        console.log(req.session,req.body, req.params,req.query)
    } catch (error) {
        console.error("error while loading the order details page", error)
        res.redirect('/admin/pageError')     
    }
}

const getStockPage = async (req,res)=>{
    try {
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let skipCount = (currentPage - 1) * itemsPerPage;
        const [totalProducts, currentProducts] = await Promise.all([
            Product.countDocuments({ isBlocked: false }), 
            Product.find({ isBlocked: false }) 
                .skip(skipCount)
                .limit(itemsPerPage)
                .lean()
        ]);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);  
        //currentOrder.forEach(order=>order.orderId= uuidv4());
        console.log("product", currentProducts,"currentPage",currentPage,"totalPages",totalPages)
        res.render("stock", {products:currentProducts, currentPage:currentPage, totalPages:totalPages});  
    }
    catch (error) {
        console.error("error while loading the stock page", error)
        res.redirect('/admin/pageError')  
    }
}

const addQuantity = async (req,res)=>{
    try {
        console.log(req.body)
        const { quantity, productId } = req.body;
        await Product.updateOne({_id: productId},{$inc:{quantity:quantity}});
        console.log("stock updated")
        res.json({ status: true });
    } catch (error) {
        console.error("Error while adding quantity", error);
        res.status(500).redirect("/admin/pageError");   
    }
}

module.exports = {
    loadOrders,
    updateOrderStatus,
    getOrderDetailsPageAdmin,
    getStockPage,
    addQuantity,
    updateReturnStatus
}


