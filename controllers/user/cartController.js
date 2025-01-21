const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const mongodb =  require('mongodb');
const mongoose = require("mongoose");



//load the cart page with cart items
const getCartPage = async(req,res)=>{
    try {
        
        const id = req.session.user;
        console.log(id,typeof(id))
        const user = await User.findById(id)
        console.log(id,user)
        const productIds = user.cart.map((item)=>{
            item.productId
        })
        const products = await Product.find({_id:{$in:productIds}})
        const oid = new mongoose.Types.ObjectId(id) 
        let data = await User.aggregate([
            {$match:{_id:oid}},
            {$unwind:"$cart"},
            {
                $project:{
                    proId:{$toObjectId:"$cart.productId"},
                    quantity:"$cart.quantity",

                },
            },
            {
                $lookup:{
                    from:"products",
                    localField:"proId",
                    foreignField:"_id",
                    as:"productDetails"
                }
            }
        ]);
        let quantity=0;
        for(const i of user.cart){
            quantity+=i.quantity;
        }
        let grandTotal = 0;
        for(let i=0;i<data.length;i++){
            if(products[i]){
                grandTotal += data[i].productDetails[0].salePrice *data[i].quantity;

            }
            req.session.grandTotal = grandTotal;
        }
        res.render('cart',{user,data,quantity,grandTotal});
        
    } catch (error) {
        console.error("error while rendering the cart page",error);
        res.redirect('/pageNotFound')
        
    }
}



const addToCart = async(req,res)=>{
    try {
       const id = req.body.id;
       const userId = req.session.user;
       console.log(userId,typeof(userId),req.session.user)
       const findUser = await User.findById(userId);
       const product = await Product.findById(id);

       if(!product){
        console.log("product not found")
        return res.status(404).json({message:"Product not found"})
       }
       if(product.quantity<=0){
        console.log("product is out of stock")
        return res.status(404).json({message:"Product is out of stock"})
       }
       const cartIndex= findUser.cart.findIndex((item)=>item.productid==id);

       if(cartIndex===-1){
        const quantity =1;
        await User.findByIdAndUpdate(userId,{
            $addToSet:{
                cart:{
                    productid:id,
                    quantity:quantity,
                }
            }
        })
        return res.json({status:true, cartLength:findUser.cart.length,user:userId});

       }else{
        const productInCart = findUser.cart[cartIndex];
        if(productInCart.quantity<product.quantity){
            const newQuanity = productInCart.quantity+1;
            await User.updateOne({
                _id:userId, "cart.productId":id
            },
        {
            $set:{"cart.$quantity":newQuanity}
        })
        return res.json({status:true, cartLength:findUser.cart.length,user:userId});
       }
       else{
        return res.json({status:"Out of stock"})
       }}
        
    } catch (error) {
        console.error("error while adding to cart",error);
        res.redirect('/pageNotFound')
        
    }
}


// const addToCart = async (req, res) => {
//     try {
//       const id = req.body.id; // Product ID from the request body
//       const userId = req.session.user; // User ID from the session
  
//       console.log(userId, typeof userId, req.session.user);
  
//       const findUser = await User.findById(userId);
//       const product = await Product.findById(id);
  
//       if (!product) {
//         console.log("Product not found");
//         return res.status(404).json({ message: "Product not found" });
//       }
  
//       if (product.quantity <= 0) {
//         console.log("Product is out of stock");
//         return res.status(404).json({ message: "Product is out of stock" });
//       }
  
//       // Find product in the user's cart
//       const cartIndex = findUser.cart.findIndex((item) =>
//         item.productid.equals(id)
//       );
  
//       if (cartIndex === -1) {
//         // If product is not in the cart, add it
//         const quantity = 1;
//         await User.findByIdAndUpdate(userId, {
//           $addToSet: {
//             cart: {
//               productid: id,
//               quantity: quantity,
//               price: product.price,
//               totalPrice: product.price * quantity,
//             },
//           },
//         });
//         return res.json({ status: true, cartLength: findUser.cart.length + 1, user: userId });
//       } else {
//         // If product exists in the cart, update its quantity
//         const productInCart = findUser.cart[cartIndex];
//         if (productInCart.quantity < product.quantity) {
//           const newQuantity = productInCart.quantity + 1;
//           await User.updateOne(
//             { _id: userId, "cart.productid": id },
//             {
//               $set: {
//                 "cart.$.quantity": newQuantity,
//                 "cart.$.totalPrice": newQuantity * product.price,
//               },
//             }
//           );
//           return res.json({ status: true, cartLength: findUser.cart.length, user: userId });
//         } else {
//           // If stock is insufficient
//           return res.json({ status: "Out of stock" });
//         }
//       }
//     } catch (error) {
//       console.error("Error while adding to cart", error);
//       res.redirect("/pageNotFound");
//     }
//   };
  

module.exports = {
    getCartPage,
    addToCart
}