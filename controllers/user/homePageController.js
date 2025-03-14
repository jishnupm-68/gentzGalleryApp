const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product  = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Banner = require('../../models/bannerSchema');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")

const pageNotFound = (req,res)=>{
    try{
        res.render('page-404')
        consile.log("rendering error page")
    }catch(error){
        console.error("Error while loading error page", error)     
        res.redirect('/pageNotFound')
    }
}

const loadHomePage = async(req,res)=>{
    try{
        console.log("Session detaiils from load home page", req.session.user)
        const user = req.session.user;
        const categories = await Category.find({isListed:true});
        const productData = await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},
            quantity:{$gt:0}
        })
        productData.sort((a,b)=>{new Date(b.createdOn)-new Date(a.createdOn)})       
        let productDataResponse = productData.slice(0,4)
        console.log(productData.length,"Is the no of products aVailable",productDataResponse.length)
       // console.log("User from loadhomePage",user)
        if(user ){
            const userData = await User.findOne({_id:user})
            console.log("userdata while using load homepage",userData.isBlocked)
            if( userData.isBlocked==true){
                console.log("User is not blocked")
                req.session.user = undefined
                return res.render("home",{user:undefined, products:productDataResponse})
            }else{
                return res.render("home",{user:userData, products:productDataResponse})
            }
            return res.render("home",{user:userData, products:productDataResponse})
           //return res.render("home",{user:userData})
        }
        else{
            return res.render("home",{products:productData})
        }
    }catch(error){
        console.log("home page not found");
        res.status(500).send("server error");
    }   
}

const loadShopPage = async (req,res)=>{
    try{
        const userId = req.session.user;
        const [userData, categories] = await Promise.all([
            User.findOne({ _id: userId }),
            Category.find({ isListed: true })
        ]);        
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page)||1;
        const limit = 9;
        const skip = (page-1)*limit;
        const [products, totalProducts, brands] = await Promise.all([
            Product.find({
                isBlocked: false,
                category: { $in: categoryIds },
                quantity: { $gt: 0 }
            })
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
            Product.countDocuments({
                isBlocked: false,
                category: { $in: categoryIds }
            }),       
            Brand.find({ isBlocked: false }).lean() 
        ]);       
        const totalPages = Math.ceil(totalProducts/limit);   
        const categoriesWithIds = categories.map((category)=>({_id:category._id,name:category.name}));
        //console.log(products[0])
        res.render("shopPage",{
            user:userData,
            products:products,
            category:categoriesWithIds,
            brand:brands,
            currentPage:page,
            totalPages:totalPages
        })      
    }catch(error){
        console.log("error while loading the shop page",error)
        res.redirect("/pageNotFound")
    }
}

const filterProduct  = async (req, res) => {
    try {
        const user = req.session.user;
        const { filter: advancedFilter, filterOutOfStock: outOfStock, category, brand, page, gt, lt } = req.query;
        console.log("Filter Params:", req.query);   
        const [userData, findCategory, findBrand, brands, categories] = await Promise.all([
            User.findOne({ _id: user }),
            category ? Category.findById(category).select('_id') : null,
            brand ? Brand.findById(brand).select('brandName') : null,
            Brand.find({}).lean(),
            Category.find({ isListed: true }).lean()
        ]);  
        // query
        const query = { isBlocked: false, quantity: { $gt: 0 } };
        if (findCategory) query.category = findCategory._id;
        if (findBrand) query.brand = findBrand.brandName;
        if (outOfStock === "true") query.quantity = { $gte: 0 };
        if (gt && lt) query.salePrice = { $gt: gt, $lt: lt };
        
        // Rating filter
        if (["1", "2", "3", "4"].includes(advancedFilter)) {
            query.rating = { $gte: Number(advancedFilter) };
        }
        
        // Popularity & Featured Conditions
        if (advancedFilter === "Popularity") {
            query.rating = { $gte: 3 };
            query.saleCount = { $gt: 0 };
        }
        if (advancedFilter === "Featured") {
            query.$or = [
                { saleCount: { $gt: 100 } },
                { createdAt: { $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
                { productOffer: { $gt: 0 } }
            ];
        }
        // Sorting options
        const sortOptions = {
            "Low to High": { salePrice: 1 },
            "High to Low": { salePrice: -1 },
            "aA-zZ": { productName: 1 },
            "zZ-aA": { productName: -1 },
            "Popularity": { saleCount: -1 },
            "New arrivals": { createdAt: -1 }
        };
        let sortOrder = sortOptions[advancedFilter] || {};       
        // Pagination 
        const itemsPerPage = 9;
        const currentPage = parseInt(page) || 1;
        const skipCount = (currentPage - 1) * itemsPerPage;       
        const [findProducts, totalProducts] = await Promise.all([
            Product.find(query)
                .sort(sortOrder)
                .collation({ locale: "en", strength: 2 })
                .skip(skipCount)
                .limit(itemsPerPage)
                .lean(),
            Product.countDocuments(query)
        ]);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);     
        // Update user search history
        if (user) {
            const userData = await User.findById(user);
            if (userData) {
                userData.searchHistory.push({
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand.brandName : null,
                    searchedOn: new Date()
                });
                await userData.save();
            }
        }
        req.session.filteredProducts = findProducts;    
        console.log("Rendering shop page with filters");
        res.render("shopPage", {
            user: userData,
            products: findProducts,
            category: categories,
            brand: brands,
            currentPage,
            totalPages,
            selectedCategory: category || null,
            selectedBrand: brand || null,
            selectedPriceRange: gt && lt ? { gt, lt } : null
        });
    } catch (error) {
        console.error(`Filter error at ${req.url}:`, error.message);
        res.status(500).json({ error: "Something went wrong. Please try again later." });
    }
};

const searchProducts  = async(req,res)=>{
    try{
        let productLength =0;
        const user = req.session.user;      
        let search = req.body.query;
        console.log(req.body,req.query,req.params);
        const [userData, brands, categories]  = await  Pormise.all([ 
            User.findOne({_id:user}),
            Brand.find({}).lean(),
            Category.find({isListed:true}).lean(),
         ])
        const categoryIds = categories.map((category)=>{
            cateogry=>category._id.toString()
        }) 
        console.log("filtered products:", req.session.filteredProducts)
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let skipCount = (currentPage - 1) * itemsPerPage;
        let query = {};
        // If session has filtered products, use it
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            query = { 
                productName: { $regex: search, $options: "i" } 
            };
        } else {
            query = {
                $or: [
                    { productName: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                    { brand: { $regex: search, $options: "i" } }
                ]
            };
        }
        const [totalProducts, searchResult] = await Promise.all([
            Product.countDocuments(query),  
            Product.find(query)
                .sort({ createdOn: -1 }) 
                .skip(skipCount) 
                .limit(itemsPerPage) 
                .lean() 
        ]);
         const totalPages = Math.ceil(totalProducts / itemsPerPage);    
        res.render('shopPage',{
            user:userData,
            products:searchResult,
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
    loadHomePage,
    pageNotFound,
    loadShopPage,  
    filterProduct,
    searchProducts,
}


