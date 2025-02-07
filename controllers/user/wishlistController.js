const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");


const loadWishlist = async(req,res)=>{
    try {
      console.log("rendered wishlist");
      res.render('wishlist');
    }catch(error){
        console.log("Error while rendering the wishlist",error)
        res.status(500).send("Server Error")
    }
}

const addToWishlist = async (req,res)=>{
    try {

    } catch (error) {
        
    }
}





module.exports = {
    loadWishlist,
    addToWishlist
}