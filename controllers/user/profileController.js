
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require("../../models/orderSchema")
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require("express-session");
const { randomUUID  } = require('crypto');


//function for generating otp
function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000)
}

//function for sending the otp via email
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
        console.log("Email sent", otp)
        return true
    } catch (error) {
        console.error("ERror while sending email",error)
        return false 
    }
}

//rendering the user profile page
const loadUserProfile = async(req,res)=>{
    try{
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

//rendering the change password page from user profile
const loadChangePasswordFromProfile = async (req,res)=>{
    try{
        const user= await User.findOne({_id:req.session.user})
        console.log("rendering the change password page from user profile")
        res.render('changePasswordFromProfile',{user:user})
    }catch(error){
        console.error("error while rendering the change password page",error)
        res.redirect('/pageNotFound')
    }
}

//function for verifying email and senting the otp
const verifyEmail = async (req,res)=>{
    try{
        const {email} = req.body;
        const userId = req.session.user;
        const sessionUser = await User.findOne({_id:userId});
        if(email === sessionUser.email){
            const otp = generateOtp();
            const emailSent = await sentVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = {email}
                res.json({success:true, message:"OTP successfully sent", redirectUrl:"/loadChangeEmailVerifyOtpForPassword"})
                console.log("OTP SEND",otp)        
            }else{
                console.log("Email not sent , something went wrong")
                res.json({success:false, message:"Email not sent , something went wrong"})
            }
        }else{
            console.log("no user with given email id")
            res.json({success:false, message:"The given email id is not matching with your account"})
        }
    }catch(error){
        console.error("error while changing the email",error)
        res.redirect('/pageNotFound')
    }
}

//rendering the verify otp page for changing password 
const loadChangeEmailVerifyOtpForPassword = async (req,res)=>{
    try{
        const user= await User.findOne({email:req.session.userData.email})
        res.render('changeEmailVerifyOtpForPassword',{user:user})
        console.log("rendering changeEmailVerifyOtpForPassword page")
    }catch(error){
        console.error("error while rendering the change password  page",error)
        res.redirect('/pageNotFound')
    }
}

//function for verifying email otp for changing password
const verifyEmailOtpForPassword =  async(req,res)=>{
    try{
        const enteredOtp = Number(req.body.otp);
        if(enteredOtp === req.session.userOtp){     
            console.log("Otp verified successfully")       
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

//rendering the change password new page
const loadChangePasswordNew = async (req,res)=>{
    try{
        const user= await User.findOne({email:req.session.userData.email})
        console.log("rendering the change password new page")
        res.render('changePasswordNew',{user:user})
    }catch(error){
        console.error("error while rendering the change password new page",error)
        res.redirect('/pageNotFound')
    }
}

//function for updating the password  to the database  and hashed before storing
const  updatePassword = async(req,res)=>{
    try{
        const newPassword = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        if(newPassword !== confirmPassword){        
            res.json({success:false, message:"Password do not match"})
        }else{
            const hashedPassword = await bcrypt.hash(newPassword,10);
            const {email} = req.session.userData;
            const user = await User.updateOne({email:email},
                {$set:{password:hashedPassword}}
            );  
            res.json({success:true, message:"Password changed successfully", redirectUrl:"/userProfile"})
        }
    }catch(error){
        console.error("error while changing the password",error)
        res.redirect('/pageNotFound')
    }
}


const generateReferal = async(req,res)=>{
    try {
        const userId =req.query.id
        const referalCode = randomUUID().replace(/-/g, '').slice(0, 8);;
        let updateCode = await User.findByIdAndUpdate({_id:userId},{$set:{referalCode:referalCode}})
        if(updateCode){
            console.log("referal Code generated");
            res.json({success:true, message:"Referal code created successfully", redirectUrl:'/userProfile'})
        }else{
            console.log("Failed to update code");
            res.json({success:false, message:"Failed to generate or save referal code", redirectUrl:'/userProfile'});
        }
    } catch (error) {
        console.log("error while generate and store referal code",error);
        res.redirect("/pageNotFound")
    }
}



//exporting the functions  for user profile and change password
module.exports = {
    loadUserProfile,
    loadChangePasswordFromProfile,
    verifyEmail,
    verifyEmailOtpForPassword,
    loadChangePasswordNew,
    updatePassword,
    loadChangeEmailVerifyOtpForPassword,
    generateReferal
}