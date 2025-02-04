const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product  = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Banner = require('../../models/bannerSchema');


const filterProduct = async (req,res)=>{
    try{
        const advancedFilter =req.query.filter;
        console.log(" advancedFilter is", advancedFilter, typeof(advancedFilter))
        const outOfStock = req.query.filterOutOfStock;
        console.log(typeof(outOfStock),outOfStock)
        let filters = [];
        const user = req.session.user;
        const category = req.query.category;
        const brand = req.query.brand;
        const findCategory = category?await Category.findOne({_id:category}):null;
        const findBrand = brand?await Brand.findOne({_id:brand}):null;
        const brands = await Brand.find({}).lean();
        const query = {
            isBlocked:false,
            quantity:{$gt:0}
        }

        console.log("query initiation",query)
        
        if(findCategory){
            query.category = findCategory._id
        }
        if(findBrand){
            query.brand = findBrand.brandName
        }
        if(outOfStock=="true"){
            console.log("Called outofstock") 
            query.quantity={$gte:0};
            console.log("query is", query)
        }else{
            console.log("Called outofstock else") 
            query.quantity={$gt:0};
            console.log("query is", query)
        }
        if(advancedFilter =="4"){
            query.rating = {$gte:4};
        }
        if(advancedFilter =="3"){
            query.rating = {$gte:3};
        }
        if(advancedFilter =="2"){
            query.rating = {$gte:2};
        }
        if(advancedFilter =="1"){
            query.rating = {$gte:1};
        }
        let sortOrder = {};
        if(advancedFilter =="Low to High"){
            console.log("Low to high")
            sortOrder.salePrice = 1
           
        }

        if(advancedFilter =="High to Low"){
            console.log("High to Low")
            sortOrder.salePrice = -1
        }
        if(advancedFilter =="aA-zZ"){
            console.error("aA-zZ")
            sortOrder.productName = 1
        }

        if(advancedFilter =="zZ-aA"){
            console.log("zZ-aA")
            sortOrder.productName = -1
        }
        if(advancedFilter=="New arrivals"){
            console.log("latest products");
            sortOrder.createdAt = -1;
        }


        if (advancedFilter == "Featured") {
            console.log("featured products");
            filters.push(
               
                { saleCount: { $gt: 100 } }, // Popularity filter
                { createdAt: { $gt: new Date() - 30 * 24 * 60 * 60 * 1000 } }, // New arrivals filter
                { productOffer: { $gt: 0 } } // Products with discounts
            );
        }

        // Add the filters to the query if any
        if (filters.length > 0) {
            query.$or = filters;
        }
        console.log("before finding the products, query, order" ,query, sortOrder)
        let findProducts = await Product.find(query).sort(sortOrder).collation({ locale: "en", strength: 2 }).lean();
        //findProducts.sort((a,b)=>{new Date(b.createdOn) - new Date(a.createdOn)})

        console.log("After find the product", findProducts)

        const categories = await Category.find({isListed:true})
        let itemPerPage =9;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemPerPage;
        let endIndex = startIndex + itemPerPage;
        let totalPages  = Math.ceil(findProducts.length/itemPerPage);
        console.log(startIndex,endIndex)
        let currentProduct = findProducts.slice(startIndex,endIndex);
        
        let userData = null;

        if(user){
            userData = await User.findOne({_id: user})
            if(userData){
                const searchEntry = {
                    category:findCategory?findCategory._id:null,
                    brand:findBrand?findBrand.brandName:null,
                    searchedOn: new Date(),
                }
                userData.searchHistory.push(searchEntry);
                await userData.save()
            }
        }
        req.session.filteredProducts = currentProduct;
        if(findProducts){
            console.log("Rendering page")
            res.render("shopPage",{
                user:userData,
                products:currentProduct,
                category:categories,
                brand:brands,
                currentPage:currentPage,
                totalPages:totalPages,
                selectedCategory:category||null,
                selectedBrand:brand||null,
            })
            console.log("rendered")
        } 
    }catch(error){
        console.error("Filter error",error)
        res.redirect("/pageNotFound");

    }
}

const filterByPrice = async (req,res)=>{
    try{
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({isListed:true}).lean();

        let findProducts = await Product.find({
            salePrice:{$gt:req.query.gt ,$lt:req.query.lt},
            isBlocked:false,
            //quantity:{$gt:0}
        }).lean()

        findProducts.sort((a,b)=>{
             new Date(b.createdOn) - new Date(a.createdOn)
        })
        let itemsPerPage = 6;
        let currentpage = parseInt(req.query.page)||1;
        let startIndex = (currentpage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages  = Math.ceil(findProducts.length/itemsPerPage);
        let currentProduct = findProducts.slice(startIndex,endIndex);
        req.session.filteredProduct = findProducts;

        res.render("shopPage",{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            currentPage:currentpage,
            totalPages:totalPages,
            selectedPriceRange: {gt:req.query.gt, lt:req.query.lt}
        })

    }catch(error){
        console.error(error)
        res.redirect("/pageNotFound")
    }
}

const searchProducts  = async(req,res)=>{
    try{
        let productLength =0;
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        let search = req.body.query;
        console.log(req.body,req.query,req.params);
        const brands =await Brand.find({}).lean();
        const categories = await Category.find({isListed:false}).lean();
        const categoryIds = categories.map((category)=>{
            cateogry=>category._id.toString()
        })

        let searchResult = [];
        console.log("filtered products:", req.session.filteredProducts)
        
         if(req.session.filteredProducts){
            productLength = req.session.filteredProducts.length;
         }
        if(req.session.filteredProducts && productLength>0){
            searchResult = req.session.filteredProducts.filter((product)=>
                 product.productName.toLowerCase().includes(search.toLowerCase()))
        }else{
            searchResult = await Product.find(
            { $or: [{ productName: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } },{ brand: { $regex: search, $options: 'i' } }] }).lean();
            
            }
        searchResult.sort((a,b)=>{
             new Date(b.createdOn) - new Date(a.createdOn)
        })


        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages  = Math.ceil(searchResult.length/itemsPerPage);
        let currentProduct = searchResult.slice(startIndex,endIndex);

        res.render('shopPage',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            currentPage:currentPage,
            totalPages:totalPages,
            count:searchResult.length
        })

    }
    catch(error){
        console.error("Search error", error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    filterProduct,
    filterByPrice,
    searchProducts,
}
