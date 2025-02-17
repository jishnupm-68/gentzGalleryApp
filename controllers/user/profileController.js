
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require("../../models/orderSchema")
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require("express-session");

function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000)
}

const sentVerificationEmail =  async(email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions ={
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verification Code",
            text: `Your verification code is ${otp}`,
            html: `<b>Your Verification Code for changing the password: ${otp}</b> `
        }
        
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent", info.messageId, otp)
        return true
    
} catch (error) {
    console.error("ERror while sending email",error)
    return false
    
}


}

const loadUserProfile = async(req,res)=>{
    try{
        console.log(req.body , req.session)
        const userId = req.session.user;
        const [userData,addressData, order , wallet] = await Promise.all ([
            User.findOne({_id:userId}),
            Address.findOne({userId:userId}),
            Order.find({userId:userId}).sort({createdOn:-1}),
            Order.find({userId:userId}).sort({"orderedItems.refundDate":-1})
        ])
        console.log("rendering the user profile page")
        res.render("profilePage", {user:userData, userAddress:addressData,order:order, walletSummary:wallet});
    }
    catch(error){
        console.error("Error while rendering the user profile page", error)
        res.redirect('/pageNotFound')
    }
}

const loadChangePasswordFromProfile = async (req,res)=>{
    try{
        const user= await User.findOne({_id:req.session.user})
        res.render('changePasswordFromProfile',{user:user})
    }catch(error){
        console.error("error while rendering the change password page",error)
        res.redirect('/pageNotFound')
    }
}

const verifyEmail = async (req,res)=>{
    try{
        const {email} = req.body;
        console.log("email is", email,req.body,req.session)
        const userId = req.session.user;
        const sessionUser = await User.findOne({_id:userId});
        //const userExists =  await User.findOne({email:email});
        if(email === sessionUser.email){
            const otp = generateOtp();
            const emailSent = await sentVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = {email}
               // res.render('changeEmailVerifyOtpForPassword',{user:sessionUser})
                res.json({success:true, message:"OTP successfully sent", redirectUrl:"/loadChangeEmailVerifyOtpForPassword"})
                console.log("OTP SEND",otp)        
            }else{
                console.log("Email not sent , something went wrong")
                res.json({success:false, message:"Email not sent , something went wrong"})
                //res.redirect('/login')
            }
        }else{
            console.log("no user with given email id")
            //res.render("changePasswordFromProfile", {message:"The given email id is not matching with your account"})
            res.json({success:false, message:"The given email id is not matching with your account"})
        }
    }catch(error){
        console.error("error while changing the email",error)
        res.redirect('/pageNotFound')
    }
}

const loadChangeEmailVerifyOtpForPassword = async (req,res)=>{
    try{
        const user= await User.findOne({email:req.session.userData.email})
        res.render('changeEmailVerifyOtpForPassword',{user:user})
        console.log("rendering changeEmailVerifyOtpForPassword page")
    }catch(error){
        console.error("error while rendering the change password new page",error)
        res.redirect('/pageNotFound')
    }
}

const verifyEmailOtpForPassword =  async(req,res)=>{
    try{
        const enteredOtp = Number(req.body.otp);
        console.log(req.body.otp, req.session.userOtp)
        if(enteredOtp === req.session.userOtp){            
            res.json({success:true, message:"OTP verified successfully", redirectUrl:"/changePasswordNew"})
        }else{
            console.log("error while validating the otp")
            res.json({success:false, message:"Invalid otp, please try again"})
        }
    }catch(error){
        console.error("error while verifying the otp",error)
        res.redirect('/pageNotFound')
    }
}

const loadChangePasswordNew = async (req,res)=>{
    try{
        const user= await User.findOne({email:req.session.userData.email})
        res.render('changePasswordNew',{user:user})
    }catch(error){
        console.error("error while rendering the change password new page",error)
        res.redirect('/pageNotFound')
    }
}

const  updatePassword = async(req,res)=>{
    try{
        console.log(req.body)
        const newPassword = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        if(newPassword !== confirmPassword){        
            res.json({success:false, message:"Password do not match"})
        }else{
            const hashedPassword = await bcrypt.hash(newPassword,10);
            console.log(req.session.userData,req.session)
            const {email} = req.session.userData;
            const user = await User.updateOne({email:email},
                {$set:{password:hashedPassword}}
            );
            //req.session.userData = undefined    
            res.json({success:true, message:"Password changed successfully", redirectUrl:"/userProfile"})
        }
    }catch(error){
        console.error("error while changing the password",error)
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    loadUserProfile,
    loadChangePasswordFromProfile,
    verifyEmail,
    verifyEmailOtpForPassword,
    loadChangePasswordNew,
    updatePassword,
    loadChangeEmailVerifyOtpForPassword
}