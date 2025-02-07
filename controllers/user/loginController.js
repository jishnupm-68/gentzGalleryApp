const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product  = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Banner = require('../../models/bannerSchema');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")



//render the login page
const loadLogin = async(req,res)=>{
    try {
        if(!req.session.user){
            console.log("render the login page")
            return res.render("login")
        }else{
            return res.redirect("/")
        }
    } catch (error) {
        console.log("Home page not loading : ",error)
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
        console.error("error while logging in with google",error)
        res.redirect("/pageNotFound")
    }
}

module.exports= {
    loadLogin,  
    login,
    logout,
    googleLogin,
}