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

const getCheckoutPage = async (req, res) => {
    try {
        const user = req.query.userId
        const findUser = await User.findOne({ _id: user });
        const addressData = await Address.findOne({userId:user})
        const oid = new mongoose.Types.ObjectId(user);
        const cart = await Cart.findOne({ userId:user }).populate("items.productid");
        const cartItems = cart.items.map((item) => {
            const product = item.productid; 
            return {
                name: product.productName,
                price: product.salePrice,
                brand:product.brand,
                category: product.category,
                stock: product.quantity,
                quantity: item.quantity,
                total: product.salePrice * item.quantity,
                image: product.productImage[0], 
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
        const [updatedUser, deletedCart] = await Promise.all([
            User.findOneAndUpdate(
                { _id: userId },
                { $set: { cart: [] } },
                { new: true }
            ),
            Cart.findOneAndDelete({ userId: userId })
        ]); 
        console.log("result of cart updating after order done", updatedUser)   
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

module.exports = {
    getCheckoutPage,
    deleteItemCheckout,
    orderPlaced,
}