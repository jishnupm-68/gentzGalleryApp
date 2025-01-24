const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");



//load the cart page with cart items
const getCartPage = async(req,res)=>{

    try {
        const userId = req.session.user; // Assuming the user ID is stored in the session
        if (!userId) {
            return res.redirect("/login");
        }

        // Find the user's cart and populate product details
        const cart = await Cart.findOne({ userId }).populate("items.productid");

        // If no cart or items exist
        if (!cart || cart.items.length === 0) {
            return res.render("cart", { user: null, items: [], grandTotal: 0 });
        }

        // Prepare cart items with product details
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

        // Calculate the grand total
        const grandTotal = cartItems.reduce((total, item) => total + item.total, 0);
        console.log("cartItems",cartItems,"grandTotal",grandTotal,req.session.user);
        // Render the cart page
        res.render("cart", {
            user: req.session.user, // User session data
            items: cartItems,
            grandTotal,
        });
}
     catch (error) {
        console.error("error while rendering the cart page",error);
        res.redirect('/pageNotFound')
        
    }
}






const addToCart = async (req, res) => {
    try {
        console.log("body",req.body)
      const userId = req.session.user; // Assuming user is stored in session
      const { productId,price,quantity } = req.body; // Expecting data from the frontend
    
      const productid = productId; // Assuming productid is sent as a string from the frontend
  
      // Validate input
      if (!mongoose.Types.ObjectId.isValid(productid)) {
        return res.status(400).send({ message: "Invalid product ID" });
      }
      
  
      // Calculate total price
      const totalPrice = quantity * price;
  
      // Find the user's cart
      let userCart = await Cart.findOne({ userId });
  
      // If the user has no cart, create one
      if (!userCart) {
        userCart = new Cart({
          userId,
          items: [
            {
              productid,
              quantity,
              price,
              totalPrice,
            },
          ],
        });
      } else {
        // If cart exists, check if the product is already in the cart
        const productIndex = userCart.items.findIndex(
          (item) => item.productid.toString() === productid
        );
  
        if (productIndex >= 0) {
          // Product exists in cart, update quantity and total price
          userCart.items[productIndex].quantity += quantity;
          userCart.items[productIndex].totalPrice += totalPrice;
        } else {
          // Product does not exist, add new item
          userCart.items.push({
            productid,
            quantity,
            price,
            totalPrice,
          });
        }
      }
  
      // Save the cart
      await userCart.save();
  
      // Link the cart to the user if not already linked
      const user = await User.findById(userId);
      if (!user.cart.includes(userCart._id)) {
        user.cart.push(userCart._id);
        await user.save();
      }
      console.log("Cart updated, new product added")
      res.redirect('/cart')
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.redirect('/pageNotFound')
    }
  };
  






const deleteItem = async(req,res)=>{
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
  


const changeQuantity =async (req,res)=>{
    try {
        let { productId, quantity, count } = req.body;
        console.log(productId,quantity, count)
        // Ensure the quantity is valid
        let newQuantity = parseInt(quantity) + parseInt(count);
        
         if(newQuantity <= 1){
            newQuantity=1;
        }
        if(newQuantity>=5){
            newQuantity=5;
        }

        
        // Find the cart and update the item's quantity
        const updatedCart = await Cart.findOneAndUpdate(
            { 'items.productid': productId }, // Match the specific product in the cart
            { $set: { 'items.$.quantity': newQuantity } }, // Update the quantity
            { new: true } // Return the updated cart
        );

        if (!updatedCart) {
            console.log("error while changing quantity")
            return res.redirect('/pageNotFound')
        }

        // Calculate the grand total after the update
        const grandTotal = updatedCart.items.reduce(
            (total, item) => total + item.quantity * item.price,
            0
        );
        console.error("cart quantity changed successfully")
        res.json({ success: true, grandTotal });
        //res.redirect('/cart')
        
    } catch (error) {
        console.error("error while changing quantity", error);
        res.redirect("/pageNotFound")
        
    }
}

module.exports = {
    getCartPage,
    addToCart,
    deleteItem,
    changeQuantity
}