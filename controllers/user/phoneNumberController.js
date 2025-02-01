const User= require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const nodemailer =require("nodemailer");
const bcrypt = require("bcrypt");

const env = require('dotenv').config();
const session = require('express-session');

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

const sentVerificationEmail = async(email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port:587,
            secure: false,
            requuireTLS: true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOption = {
            from: process.env.NODEMAILER_EMAIL,
            to : email,
            subject: "Verification Code",
            text: `Your verification code is ${otp}`,
            html: `<b>Your Verification Code for changing the phone number: ${otp}</b> `
        }
        const info = await transporter.sendMail(mailOption);
        console.log("Email sent", info.messageId, otp);
        return true
        
    } catch (error) {
        console.log("error while senting the email",error);
        return res.redirect("/pageNotFound");  
    }
}

const loadChangePhone = async(req,res)=>{
    try {
        const user = await User.findById(req.session.user);
        res.render("changePhoneEmailVerify",{user:user});
        console.log("change phone email verification page rendered",user)
        
    } catch (error) {
        console.error("error while rendering the changePhoneEmailVerify page",error);
        res.redirect('/pageNotFound');
        
    }
}

const changePhoneEmailVerify = async (req,res)=>{
    try {
        const {email}  = req.body;
        const user = await User.findOne({_id:req.session.user});
        console.log(email===user.email,email,user.email,email==user.email)
        if(email===user.email){
            const otp = generateOTP();
            const emailSent = await sentVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = {email};
                res.render("changePhoneVerifyOtp",{user:user});
            }else{
                console.log("Email not sent , something went wrong");
                res.redirect('/login');
            }
           
        }else{
            console.log("user not match")
            return res.render("changePhoneEmailVerify",{user:user,message:"The given email id is not matching with your account"})
        }
    } catch (error) {
        console.error("error while changing phone number", error);
        res.redirect('/pageNotFound');
        
    }

}

const verifyPhoneOtp = async (req,res)=>{
    try {
        const enteredOtp =  Number(req.body.otp);

        if(enteredOtp === req.session.userOtp){
            res.json({success:true, redirectUrl:"/changePhoneNew"});
        }else{
            console.log("error while validating the otp");
            res.json({success:false, message:"Invalid otp, please try again after some time"});

        }

    } catch (error) {
        console.error("error while verifying the otp",error);
        return res.redirect("/pageNotFound");
    }
}

const  loadChangePhoneNew = async (req,res)=>{
    try {
        const user = await User.findOne({email:req.session.userData.email});
        res.render("changePhoneNew",{user:user});

        
    } catch (error) {
        console.error("error while rendering the changePhoneNew page",error);
        res.redirect('/pageNotFound');
        
    }

}

const updatePhone = async (req,res)=>{
    try {
        const {phone}= req.body;
        const userId = req.session.user;
        const user = await User.findByIdAndUpdate({_id:userId},{$set:{phone:phone}});
        req.session.userData = {email:user.email};
        if(user){
            res.redirect('/userProfile');
        }else{
            console.log("error while updating the number");
            res.redirect("/pageNotFound")
        }
        
    } catch (error) {
        console.error("Error while updating the number", error),
        res.redirect ("/pageNotFound")
        
    }
}

module.exports = {
    loadChangePhone,
    changePhoneEmailVerify,
    verifyPhoneOtp,
    loadChangePhoneNew,
    updatePhone
}