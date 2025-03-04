const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");

//rendering the wishlist page
const loadWishlist = async(req,res)=>{
    try {
        const userId = req.session.user; 
        let user, wishlistItems
        try{
            [user, wishlistItems] = await Promise.all ([
                User.findOne({_id:userId}),
                Wishlist.findOne({ userId: userId }),
            ]);
        }catch(error){
            let newWishlist = new Wishlist({userId:userId});
            await newWishlist.save();
            [user, wishlistItems] = await Promise.all ([
                User.findOne({_id:userId}),
                Wishlist.findOne({ userId: userId }),
            ]);
        }
        const wishlistIds = wishlistItems.products.map((item)=>item.productId)
        const products = await Product.find({ _id: { $in: wishlistIds } });
        console.log("rendered wishlist");
        res.render('wishlist',{user:user, wishlist:products});
    }catch(error){
        console.log("Error while rendering the wishlist",error)
        res.status(500).redirect("/pageNotFound");
    }
}

//add the item to the wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.query.id;
        const productObjectId = new mongoose.Types.ObjectId(productId);
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const data = await Product.findOne({_id:req.query.id})
        if (!mongoose.Types.ObjectId.isValid(userObjectId) || !mongoose.Types.ObjectId.isValid(productObjectId)) {
            return res.status(400).json({ success: false, message: "Invalid user or product ID" });
        }
        let wishlist = await Wishlist.findOne({ userId: userObjectId });
        if(!userId){
            console.log("Please login")
            return res.json({ success: false, message: "Please Login to your account" });
        }
        if (!wishlist) {      
            wishlist = new Wishlist({
                userId: userObjectId,
                products: [{ productId: productObjectId, addedOn: new Date() }]
            });
            await wishlist.save();
            console.log("New wishlist created and product added");
        } else {  

            const productExists = wishlist.products.some(item => item.productId.equals(productObjectId));
            if (productExists) {
                console.log("Product already in wishlist");
                return res.status(200).json({ success: false, message: "Product already in wishlist" });
            }
            wishlist.products.push({ productId: productObjectId, addedOn: new Date() });
            await wishlist.save();
            console.log("Product added to wishlist");
        }
        console.log("Product added to wishlist")
        res.status(200).json({ success: true, message: "Product added to wishlist successfully" });
    } catch (error) {
        console.error("Failed to add product to wishlist", error);
        res.status(500).json({ success: false, message: "Failed to add product to wishlist, please try again later" });
    }
};

//delete the item from the wishlist
const deleteWishlistItem = async (req,res)=>{
    try {
        const userId = req.session.user;
        const productId= req.query.id;  
        const result= await Wishlist.findOneAndUpdate(
            {userId:userId},
            {$pull:
                {products:{productId:new mongoose.Types.ObjectId(productId)}}       
            },
            {new:true}
        ); 
        if(result){
            console.log("Wishlist item deleted successfully",result);
            res.status(200).json({success:true, message:"Wishlist item deleted successfully"})    
        }else{
            console.log("Wishlist item not found");
            res.status(404).json({success:false, message:"Wishlist item not found"})
        }   
    } catch (error) {
        console.log("Error while deleting wishlist item",error)
        res.status(500).json({success:false, message:"Failed to delete wishlist item, please try again later"})  
    }
}


//exporting functions
module.exports = {
    loadWishlist,
    addToWishlist,
    deleteWishlistItem
}