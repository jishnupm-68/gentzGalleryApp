const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");







const productDetails = async (req,res)=>{
    console.log("ITS productDetails")
    try{
        const userId  = req.session.user;
        const userData= await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const categoryOffer  = findCategory ?.categoryOffer ||0;
        const category = await Category.findById(findCategory);
        const productOffer = product.productOffer ||0;
        const totalOffer = categoryOffer + productOffer

        console.log("USer",userData, "product",product, "totalOffer",totalOffer,"category",findCategory,"quantity", product.quantity)
        res.render("productDetails",{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory
        })

    }catch(error){
        console.error("error while fetching productDetails",error)
        res.redirect("/pageNotFound")

    }

}



module.exports= {
    productDetails,

}