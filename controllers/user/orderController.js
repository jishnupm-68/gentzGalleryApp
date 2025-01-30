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
      // Create bulk operations based on cartItemQuantities
      const bulkOperations = cartItemQuantities.map(item => ({
        updateOne: {
          filter: { _id: item.productId }, // Match product by ID
          update: { $inc: { saleCount: item.quantity , quantity: -item.quantity } }, // Decrement saleCount by quantity
          
        },
      }));
  
      // Perform bulkWrite
      const result = await Product.bulkWrite(bulkOperations);
      console.log('Bulk decrement result:', result);
      return result;
    } catch (error) {
      console.error('Error decrementing sale counts:', error);
      throw error;
    }
  };


const getCheckoutPage = async (req, res) => {
    try {
        const user = req.query.userId
        const findUser = await User.findOne({ _id: user });
        const addressData = await Address.findOne({userId:user})
        const oid = new mongoose.Types.ObjectId(user);
        
        
     
        

        const cart = await Cart.findOne({ userId:user }).populate("items.productid");
        const cartItems = cart.items.map((item) => {
            const product = item.productid; // Populated product
            return {
                name: product.productName,
                price: product.salePrice,
                brand:product.brand,
                category: product.category,
                stock: product.quantity,
                quantity: item.quantity,
                total: product.salePrice * item.quantity,
                image: product.productImage[0], // First product image
                productId: product._id,
            };
        });



        const gTotal = req.session.grandTotal;
        // const today = new Date().toString();

        // const findCoupon = await Coupon.findOne({
        //     isListed:true,
        //     createdOn: {$lt: new Date()},
        //     expireOn: {$gt: new Date()},
        //    // minimumPrice:{$lt: grandTotal[0].totalPrice},
        // });
        console.error("cart length", cart.items.length)
        if(cart.items.length>0){
            res.render('checkout', {
               // product: data,
               product:cartItems,
                user: findUser,
                isCart:true,
                userAddress:addressData,
                grandTotal : req.session.grandTotal,
               // Coupon:findCoupon,
               Coupon:null
                //grandTotal: grandTotal[0].totalPrice,    
            });
        }else{
            res.redirect('/shop')
        }

        console.log("user", user,"oid",oid,req.session.grandTotal);
        
    } catch (error) {
        console.error("error while rendering the checkout page", error);
        res.redirect('/pageNotFound');   
    }
}


const deleteItemCheckout = async(req,res)=>{
    try {
        const productToDeleteId = req.query.id;  // Accessing the id from the query string
        console.log('Item ID:', productToDeleteId);
        const userId = req.session.user;  // User ID from the session
        const updatedCart = await Cart.findOneAndUpdate(
            {userId:userId}, // to find the user from cart
            {
                $pull:{
                    items: {productid: new mongoose.Types.ObjectId(productToDeleteId)}
                }
            },
            {new:true}
    )
    if(!updatedCart){
        console.log("error while deleting")
        return res.redirect("/pageNotFound")}
        else{
            console.log("product deleted successfully")
            res.redirect("/cart")
        }        
    } catch (error) {
        console.error("unable to delete the product from cart",error);
        res.redirect("/pageNotFound")
        
    }
}
  



const orderPlaced = async (req,res)=>{
    try{
        console.log(req.body)
        const {totalPrice, addressId, payment, discount} = req.body;
        req.session.addressId = addressId;
        const userId = req.session.user;
        const findUser = await User.findOne({_id:userId});
        const cart = await Cart.findOne({userId:userId});
        if(!findUser){
            console.error("User not found error")
            return res.json(404).json({error:"User not found"})
        }
        // const productIds = findUser.cart.map((item)=>item.productid);
        console.log("Cart", cart)
        const productIds = cart.items.map((item)=>item.productid);
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            console.error("Address not found error")
            return res.json(404).json({error:"Address not found"})
        }
        console.log("Productids",productIds)
        
        const desiredAddress = findAddress.address.find((item)=>item._id.toString()===addressId.toString());
        if(!desiredAddress){
            console.error("Desired Address not found error")
            return res.json(404).json({error:"Address not found"})
        }
        
        const findProducts = await Product.find({_id:{$in:productIds}});
        console.log("findPRoducts", findProducts, "productIds", productIds)
        if(findProducts.length !== productIds.length){
            console.error("products not found")
            return res.json(404).json({error:"Products not found"})
        }
        const cartItemQuantities = cart.items.map((item)=>
        ({
            productId:item.productid,
            quantity: item.quantity
        })
        );
        console.log("cartItemQuantities",cart, cartItemQuantities)
        const orderedProducts = findProducts.map((item)=>
        ({
            productName: item.productName,
            product: item._id,
            price: item.salePrice,
            image: item.productImage[0],
            productStatus : "Confirmed",
            quantity: cartItemQuantities.find((cartItem)=>cartItem.productId.toString()===item._id.toString()).quantity
        })
        );

        console.log("orderedProducts", orderedProducts)

        const newOrder = new Order({
            orderedItems:orderedProducts,
            totalPrice:totalPrice,
            discount:discount,
            finalAmount:totalPrice,
            address:desiredAddress,
            userId:userId,
            payment:payment,
            status: "Pending",
            orderDate: new Date()
        })

        let orderDone = await newOrder.save();
        // await User.findOneAndUpdate({_id:userId},{$set:{cart:[]}});
        let result = await User.findOneAndUpdate(
            { _id: userId },
            { $set: { cart: [] } },
            { new: true }
        );
        await Cart.findOneAndDelete({userId:userId});
        console.log("result of cart updating after order done", result)
        

        for (let orderedProduct of orderedProducts) {
            const product = await Product.findOne({ _id: orderedProduct._id });
            if (product) {
              product.quantity = Math.max(product.quantity - orderedProduct.quantity, 0);
              await product.save();
            }
          }
          console.log("orderDone", orderDone, "newOrder",newOrder)
          if(orderDone){
  
              decrementSaleCounts(cartItemQuantities)
                .then(result => console.log('Decrement successful:', result))
                .catch(error => console.error('Decrement failed:', error));
              
          }
          if (newOrder.payment === "cod") {
            console.log("COD")
            res.json({
              payment: true,
              method: "cod",
              order: orderDone,
              quantity: cartItemQuantities,
              orderId: orderDone._id,
            });
          } 
      
      console.log("order placed successfully", cartItemQuantities);

          

    }catch(error){
        console.error("error while placing the order", error)
        res.redirect('/pageNotFound')
    }

}


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
//         const cart = await Cart.findOne({ userId:userId }).populate("items.productid");
//         const cartItems = cart.items.map((item) => {
//             const product = item.productid; // Populated product
//             return {
//                 name: product.productName,
//                 price: product.salePrice,
//                 brand:product.brand,
//                 category: product.category,
//                 stock: product.quantity,
//                 quantity: item.quantity,
//                 total: product.salePrice * item.quantity,
//                 image: product.productImage[0], // First product image
//                 productId: product._id,
//             };
//         });
// console.log("cartItems",cartItems)
        res.render("orderDetails",{
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
        res.redirect('/pageNotFound')
        
    }

}


const cancelOrder = async(req,res)=>{
    try {
        console.log(req.body)
        const orderId = req.body.orderId;
        const userId = req.session.user;
        
        const findOrder = await Order.findOneAndUpdate(
            {_id:orderId, userId:userId},
            {status:"Cancelled"},
            {new:true}
        )
        const cancelItemQuantities = findOrder.orderedItems.map((item)=>
            ({
                productId:item.product,
                quantity: -item.quantity
            })
            );
            console.log("findOrder",findOrder,"cancelItemQuantities",cancelItemQuantities)
            if(findOrder){
  
                decrementSaleCounts(cancelItemQuantities)
                  .then(result => 
                    
                    {console.log('Decrement successful:', result)
                    if (result.modifiedCount === 1) {
                        return res.json({
                            success: true,
                            result, // Send MongoDB update response
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
    getCheckoutPage,
    deleteItemCheckout,
    orderPlaced,
    getOrderDetailsPage,
    cancelOrder

}