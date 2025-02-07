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
    }catch(error){
    res.redirect('/pageNotFound')
    }
}

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString()

}

async function sentVerificationEmail(email,otp){
    

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
        
        return info.accepted.length>0

    }catch(error){
        console.log("Error sending Email",error)

    }
}
 
const securePassword =async (password)=>{
    try{
        const  passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){

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

module.exports = {
    loadHomePage,
    pageNotFound,
    loadShopPage,  
}


