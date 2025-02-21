const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product  = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Banner = require('../../models/bannerSchema');


const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const { filter: advancedFilter, filterOutOfStock: outOfStock, category, brand, page } = req.query;
        console.log("Advanced Filter:", advancedFilter, "Out of Stock:", outOfStock, "bodd",req.body,req.query,req.params);
        const [userData ,findCategory, findBrand, brands] = await Promise.all([
            User.findOne({ _id: user }),
            category ? Category.findById(category).select('_id') : null,
            brand ? Brand.findById(brand).select('brandName') : null,
            Brand.find({}).lean()
        ]);

        // Base query
        const query = { isBlocked: false, quantity: { $gt: 0 } };
        if (findCategory) query.category = findCategory._id;
        if (findBrand) query.brand = findBrand.brandName;

        // Handle Out of Stock filtering
        if (outOfStock === "true") query.quantity = { $gte: 0 };

        //  Rating-based filters
        if (["1", "2", "3", "4"].includes(advancedFilter)) {
            query.rating = { $gte: Number(advancedFilter) };
        }

        // Sorting 
        const sortOptions = {
            "Low to High": { salePrice: 1 },
            "High to Low": { salePrice: -1 },
            "aA-zZ": { productName: 1 },
            "zZ-aA": { productName: -1 },
            "Popularity": { saleCount: -1 },
            "New arrivals": { createdAt: -1 }
        };
        let sortOrder = sortOptions[advancedFilter] || {};       

        // Popularity Condition
        if (advancedFilter === "Popularity") {
            query.rating = { $gte: 3 };
            query.saleCount = { $gt: 0 };
        }
        // Featured Products Condition
        if (advancedFilter === "Featured") {
            query.$or = [
                { saleCount: { $gt: 100 } },
                { createdAt: { $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } }, 
                { productOffer: { $gt: 0 } }
            ];
        }
        console.log("Query:", query, "Sort Order:", sortOrder);
        // Pagination  and filtering
        const itemsPerPage = 9;
        const currentPage = parseInt(page) || 1;
        const skipCount = (currentPage - 1) * itemsPerPage;
       
        const [findProducts, totalProducts, categories] = await Promise.all([
            Product.find(query)
                .sort(sortOrder)
                .collation({ locale: "en", strength: 2 })
                .skip(skipCount)
                .limit(itemsPerPage)
                .lean(),
            Product.countDocuments(query),
            Category.find({ isListed: true }).lean()
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
        // Render the shop page
        if (findProducts) {
            console.log("Rendering shopping page");
            res.render("shopPage", {
                user: userData,
                products: findProducts,
                category: categories,
                brand: brands,
                currentPage,
                totalPages,
                selectedCategory: category || null,
                selectedBrand: brand || null
            });
        }
    } catch (error) {
        console.error(`Filter error at ${req.url}:`, error.message);
        res.status(500).json({ error: "Something went wrong. Please try again later." });
    }
};



const filterByPrice = async (req,res)=>{
    try{
        const user = req.session.user;
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const skipCount = (currentPage - 1) * itemsPerPage;

        const [userData, brands, categories, totalProducts, findProducts] = await Promise.all([
            User.findOne({ _id: user }),
            Brand.find().lean(),
            Category.find({ isListed: true }).lean(),
            Product.countDocuments({
                salePrice: { $gt: req.query.gt, $lt: req.query.lt },
                isBlocked: false
            }),
            Product.find({
                salePrice: { $gt: req.query.gt, $lt: req.query.lt },
                isBlocked: false
            })
            .sort({ createdOn: -1 })  
            .skip(skipCount)
            .limit(itemsPerPage)
            .lean()
        ]);

        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        req.session.filteredProduct = findProducts;
        console.log("Rendering shop page after filter by price");
        res.render("shopPage",{
            user:userData,
            products:findProducts,
            category:categories,
            brand:brands,
            currentPage:currentPage,
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
    filterProduct,
    filterByPrice,
    searchProducts,
}
