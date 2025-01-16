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



        const query = {
            isBlocked:false,
           // quantity:{$gt:0}
        }
        if(findCategory){
            query.category = findCategory._id
        }
        
        let findProducts = await Product.find(query).limit(4).lean();
        findProducts.sort((a,b)=>{
            new Date(b.createdOn) - new Date(a.createdOn)
        })

        let similiarProductsLength = findProducts.length;


        
        let currentPage = parseInt(req.query.page) || 1;
        
        let currentProduct = findProducts
        
        




        console.log("USer", "product",product,product.ratings, product.ratings.comment, "totalOffer",totalOffer,"category",findCategory,"quantity", product.quantity)
        res.render("productDetails",{
            user:userData,
            product:product,
            products:currentProduct,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
            length:currentProduct.length
        })

    }catch(error){
        console.error("error while fetching productDetails",error)
        res.redirect("/pageNotFound")

    }

}



module.exports= {
    productDetails,

}