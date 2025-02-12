const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Address =  require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Transaction = require('../../models/transactionSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");
const env = require('dotenv').config();
const Razorpay  = require('razorpay');
const crypto = require("crypto");


var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

function generateRazorpay(orderId,totalPrice,callback){
    var options = {
        amount: totalPrice*100, 
        currency: "INR",
        receipt: orderId
      };
      instance.orders.create(options, function(err, order) {
        if(err){
            console.error("error in generate razorpay function",err)
        }else{
           // console.log("order",order)
            //req.session.orderId = order.id
            callback(null,order)
           // return order
        }
      });
}

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

const getCheckoutPage = async (req, res) => {
    try {
        const user = req.query.userId
        const [findUser,addressData,coupon] = await Promise.all ([
            User.findOne({ _id: user }),
            Address.findOne({userId:user}),
            Coupon.find({isListed:true})
        ]);
        //console.log("usercoupon", coupon)
        const oid = new mongoose.Types.ObjectId(user);
        const cart = await Cart.findOne({ userId:user }).populate("items.productid");
        
        let couponAppliedId = coupon.map(item=> item.userId==user?item._id:null) ;
        const validCouponId = couponAppliedId.filter(id => id !== null);
        
        const cartItems = cart.items.map((item) => {
            const product = item.productid; 
            let price = product.offerPrice>0?product.offerPrice:product.salePrice;
            return {
                name: product.productName,
                price:price,
                brand:product.brand,
                category: product.category,
                stock: product.quantity,
                quantity: item.quantity,
                total: product.salePrice * item.quantity,
                image: product.productImage[0], 
                productId: product._id,
            };
        });
        let finalAmount=0;
        let couponApplied = await Coupon.findById(validCouponId)
        //console.log(" coupon",couponApplied, req.session.discount,couponApplied.offeredPrice)
        if(couponApplied){
            console.log(" coupon",couponApplied, req.session.discount,couponApplied.offeredPrice)
            req.session.discount = (Number(req.session.discount) || 0) + Number(couponApplied.offeredPrice);

            finalAmount = req.session.grandTotal - req.session.discount;
        }else{
            finalAmount = req.session.grandTotal 
        }
        console.log("discount",req.session.discount)
        
        const gTotal = req.session.grandTotal;
        req.session.finalAmount = finalAmount;
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
                discount: req.session.discount,
                finalAmount:finalAmount,
               // Coupon:findCoupon,
               Coupon:coupon
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
        const productToDeleteId = req.query.id;  
        console.log('Item ID:', productToDeleteId);
        const userId = req.session.user;  
        const updatedCart = await Cart.findOneAndUpdate(
            {userId:userId},
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
            productStatus : "Pending",
            quantity: cartItemQuantities.find((cartItem)=>cartItem.productId.toString()===item._id.toString()).quantity
        })
        );
       
        let orderDone,newOrder;
        newOrder = new Order({
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
        orderDone = await newOrder.save(); 
        console.log("orderedProducts", orderDone)
        req.session.orderDbId = orderDone._id
        if(payment === "cod"){
              
        }else if(payment === "razorpay"){
            console.log("razorpay")
            generateRazorpay(orderDone._id,orderDone.totalPrice,(err,order)=>{
                if(err){
                    console.log("error whil creating the razorpay payment",err)
                }else{
                    console.log("order placed now for razorpay",order)
                    
                    req.session.orderId = order.id
                    res.json({
                        payment: true,
                        method: "razorpay",
                        order: orderDone,
                        quantity: cartItemQuantities,
                        orderId: order.id,
                        user:findUser,
                    });
                }
            });   
        }
        const [updatedUser, deletedCart] = await Promise.all([
            User.findOneAndUpdate(
                { _id: userId },
                { $set: { cart: [] } },
                { new: true }
            ),
            Cart.findOneAndDelete({ userId: userId })
        ]); 
        
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
      //console.log("order placed successfully", cartItemQuantities);
    }catch(error){
        console.error("error while placing the order", error)
        res.redirect('/pageNotFound')
    }
}

const verifyPayment = async(req,res)=>{
    try {
        console.log("incoming data", req.body,req.session)
        const order_id = req.session.orderId;
        const payment_id = req.body.response.razorpay_payment_id;
        const razorpay_signature = req.body.response.razorpay_signature;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        let hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(
           order_id + "|" + payment_id
        )
        hmac  = hmac.digest('hex');
        console.log("hmac",hmac, req.body)
    if (hmac == razorpay_signature) {
        console.log("payment verified");

         const newTransaction  = new Transaction({
            userId: req.session.user,
            details:{
                amount: req.session.grandTotal,
                currency: "INR",
                orderId: req.session.orderDbId,
                orderRazorpayId: req.session.orderId,
                paymentId: payment_id,
                paymentStatus: "success",
                paymentMethod: "razorpay",
                paymentDate: new Date(),  
            }
            
         }) 
         await newTransaction.save();
    
        res.json({ success: true, message: "Payment verified successfully" });
            }
        
    } catch (error) {
        console.log("error while verifying the payment", error);
        res.redirect('/pageNotFound')  
    }
}


const useCoupon = async(req,res)=>{
    try {
        let {couponName, couponId,grandTotal} = req.body
        couponId = couponId.trim()
        const oid = new mongoose.Types.ObjectId(couponId);
        console.log("useCoupon",req.body, oid)
        const userId=req.session.user;
        
        

       let coupon = await Coupon.findOne({_id: couponId});
       console.log("coupon",coupon)
        if(grandTotal>coupon.minimumPrice){
            let oldCoupon = await Coupon.updateMany(
                { userId: userId }, 
                { $pull: { userId: userId } } 
            );
            req.session.discount = (Number(req.session.discount) || 0) + Number(oldCoupon.offeredPrice);
    
            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                { $addToSet: { userId: userId } }, 
                { new: true }
            );
            if(updatedCoupon){
                console.log("CouponApplied");
                res.json({success:true, message: "Coupon applied successfully"})
            }else{
                console.log("Coupon not applied");
                res.json({success:false, message: "Coupon not applied"})
            }
        }else{
            console.log("Coupon minimum price not met");
            res.json({success:false, message: "Coupon minimum price not met"})
        }
       
    } catch (error) {
        console.error("error while submitting coupon", error);
        res.redirect('/pageNotFound')
        
    }
}


const removeCoupon = async(req,res)=>{
    try {
        let {couponName, couponId} = req.body
        couponId = couponId.trim()
        const oid = new mongoose.Types.ObjectId(couponId);
        console.log("useCoupon",req.body, oid)
        const user=req.session.user;
        const updateCoupon = await Coupon.findByIdAndUpdate({_id:couponId},
            {
                $pull: {userId:user}
            },
            {new:true}
        )
        if(updateCoupon){
            console.log("Coupon deleted");
            req.session.discount = (Number(req.session.discount) || 0) - Number(updatedCoupon.offeredPrice);
            res.json({success:true, message: "Coupon deleted successfully"})
        }else{
            console.log("Coupon not dleted");
            res.json({success:false, message: "Coupon not deleted"})
        }
    } catch (error) {
        console.error("error while deleting coupon", error);
        res.redirect('/pageNotFound')
        
    }
}


module.exports = {
    getCheckoutPage,
    deleteItemCheckout,
    orderPlaced,
    verifyPayment,
    useCoupon,
    removeCoupon
    
}

