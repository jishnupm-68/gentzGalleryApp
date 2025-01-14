const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");







const productDetails = async (req,res)=>{
    console.log("ITS HERE")
    try{
        const userId  = req.session.user;
        console.log(userId)
        const userData= await User.findById(userId);
        console.log(userData)
        const productId = req.query.id;
        console.log(productId)
        const product = await Product.findById(productId);
        console.log(product)
        const findCategory = product.category;
        console.log(findCategory)
        const categoryOffer  = findCategory ?.categoryOffer ||0;
        const category = await Category.findById(findCategory);
        const productOffer = product.productOffer ||0;
        console.log(categoryOffer)
        const totalOffer = categoryOffer + productOffer
        res.render("productDetails",{
            user:userData,
            product:product
        })

    }catch(error){
        res.redirect("/pageNotFound")

    }

}



module.exports= {
    productDetails,

}