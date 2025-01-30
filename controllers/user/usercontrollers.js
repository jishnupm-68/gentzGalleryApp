const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product  = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Banner = require('../../models/bannerSchema');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")



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



const pageNotFound = (req,res)=>{
    try{
    res.render('page-404')
    }catch(error){
    res.redirect('/pageNotFound')
    }
}

const loadSignup = async (req,res)=>{
    try{
        return res.render("signup")
    }
    catch(error){
        console.log("Home page not loading : ",error)
        res.status(500).send("server error")
    }

}

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString()

}


async function sentVerificationEmail(email,otp){
    
    console.log("data from env", process.env.NODEMAILER_PASSWORD, process.env.NODEMAILER_EMAIL, otp)
    try{
        const transporter = nodemailer.createTransport({
            service :"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            },
            
        })
        
        const info =await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text: ` Your OTP is ${otp}`,
            html: `<b>Your OTP : ${otp}</b> `,
        })
        console.log("info ok")
        
        return info.accepted.length>0

    }catch(error){
        console.log("Error sending Email",error)

    }
}
 

const signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render("signup", { message: "Password do not Match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();
        const emailSent = await sentVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
        res.render("verifyOtp");
        console.log("OTP SENT", otp);
        return; // Prevent further execution

    } catch (error) {
        console.error("signup error", error);
        res.status(500).render("pageNotFound"); // Ensure correct response
    }
};


const securePassword =async (password)=>{
    try{
        const  passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){

    }
}

const verifyOtp = async (req,res)=>{
    try{
        const {otp} = req.body;
        console.log(otp)
        if(otp === req.session.userOtp){
            const user = req.session.userData;
            console.log("googleId", user.googleId, user)
            const passwordHash = await securePassword(user.password)
            let undefinedForGoogleId = undefined
            const saveUserData  = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                googleId:new Date(),
                password: passwordHash
            })
            console.log("Here before saving data")
            await saveUserData.save()
            console.log("next line after saving data")
            req.session.user =saveUserData._id;
            res.json({success:true, redirectUrl :'/'})
        }else{
            res.status(400).json({success:false, message:"Invalid otp, please try again"})
        }

    }catch(error){
        console.error("Error while verifying the otp", error);
        res.status(500).json({success:false, message:"An error occured"})
    }
}


const resendOtp = async(req,res)=>{
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(500).json({success:false, message:"Email not found in session"})
        }
        const otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sentVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend otp", otp);
            res.status(200).json({success:true, message:"Otp resent successfully"})
        }else{
            res.status(500).json({success:false, message:"Failed to resend the otp Please try again"})
        }
    } catch (error) {
        console.error("Error while sending otp", error)
        res.status(500).json({success:false, message: "Internal server error, please try again"})
        
    }
}



const loadLogin = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render("login")
        }else{
            return res.redirect("/")
        }
        
    } catch (error) {
        res.redirect('pageNotfound')
        
    }

}

const login = async(req,res)=>{
    try {
        const {email,password} = req.body
        const findUser = await User.findOne({isAdmin:0, email:email});
        //console.log(findUser)

        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"});
        }
        console.log("manual login",findUser._id)
        req.session.user = findUser._id;
        res.redirect('/')
    } catch (error) {
        console.log("Login error", error);
        res.render("login",{message:"Login failed, please try again after some time"})
        
    }

}

const googleLogin = async (req,res)=>{
    try{
        const userEmail= req.user.email;
        //console.log("data from req",req.user)
        const user = await User.findOne({isAdmin:false,email:userEmail});
        if(!user){
            return res.redirect("/signup")
        }
        console.log("user",user,user._id)
        if(!user){
            return res.render("login",{message:"User not found"})
        }
        if(user.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        }
       
        req.session.user = user._id;
        res.redirect('/')

    }
    catch(error){

    }
}

const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Error while destroying session",err.message)
                return res.redirect("/pageNotFound")
            }
            return res.redirect('/')
        })
        
    } catch (error) {
        console.log("Logout error",error)
        res.redirect("/pageNotFound")
    }
}


const loadShopPage = async (req,res)=>{
    try{
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page)||1;
        const limit = 9;
        const skip = (page-1)*limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0}
        }).sort({createdOn:-1}).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            //quantity:{$gt:0}
        });
        const totalPages = Math.ceil(totalProducts/limit);
        const brands = await Brand.find({isBlocked:false});
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
        res.redirect("/pageNotFound")

    }

}



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
        // if(JSON.parse(req.session.filteredProduct) && outOfStock ){
        //     console.error("in outofstock block")
        //     query.quantity=0;
      
        // }
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


// const filterProduct = async (req, res) => {
//     try {
//         const advancedFilter = req.query.filter;
//         const user = req.session.user;
//         const category = req.query.category;
//         const brand = req.query.brand;

//         const findCategory = category ? await Category.findOne({ _id: category }) : null;
//         const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;
//         const brands = await Brand.find({}).lean();

//         const query = {
//             isBlocked: false,
//             // quantity: { $gt: 0 },
//         };

//         if (findCategory) {
//             query.category = findCategory._id;
//         }
//         if (findBrand) {
//             query.brand = findBrand.brandName;
//         }

//         // Apply sorting based on advancedFilter
//         const sortOption = {};
//         if (advancedFilter === "Low to High") {
//             sortOption.salePrice = 1; // Ascending
//         } else if (advancedFilter === "High to Low") {
//             sortOption.salePrice = -1; // Descending
//         } else {
//             sortOption.createdOn = -1; // Default sorting by newest first
//         }

//         // Pagination logic
//         const itemPerPage = 9;
//         const currentPage = parseInt(req.query.page) || 1;
//         const skip = (currentPage - 1) * itemPerPage;

//         // Fetch sorted and paginated products
//         const findProducts = await Product.find(query)
//             .sort(sortOption)
//             .skip(skip)
//             .limit(itemPerPage)
//             .lean();

//         const totalProducts = await Product.countDocuments(query);
//         const totalPages = Math.ceil(totalProducts / itemPerPage);

//         const categories = await Category.find({ isListed: true });

//         let userData = null;

//         if (user) {
//             userData = await User.findOne({ _id: user });
//             if (userData) {
//                 const searchEntry = {
//                     category: findCategory ? findCategory._id : null,
//                     brand: findBrand ? findBrand.brandName : null,
//                     searchedOn: new Date(),
//                 };
//                 userData.searchHistory.push(searchEntry);
//                 await userData.save();
//             }
//         }

//         req.session.filteredProducts = findProducts;
//         res.render("shopPage", {
//             user: userData,
//             products: findProducts,
//             category: categories,
//             brand: brands,
//             currentPage: currentPage,
//             totalPages: totalPages,
//             selectedCategory: category || null,
//             selectedBrand: brand || null,
//         });
//     } catch (error) {
//         console.error(error);
//         res.redirect("/pageNotFound");
//     }
// };



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
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    googleLogin,
    logout,
    loadShopPage,
    filterProduct,
    filterByPrice,
    searchProducts
}


