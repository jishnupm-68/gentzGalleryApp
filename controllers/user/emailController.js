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

const loadChangeEmail = async (req,res)=>{
    const email= req.body;
    const findUser =  await User.findOne({_id: req.session.user});
    try{
        res.render("changeEmail",{user:findUser})
    }catch(error){
        console.error("error while rendering the change email page",error)
        res.redirect('/pageNotFound')
    }
}

const changeEmail = async (req,res)=>{
    try{
        const {email} = req.body;
        console.log("email is", email)
        const userId = req.session.user;
        const sessionUser = await User.findOne({_id:userId});
        //const userExists =  await User.findOne({email:email});
        if(email === sessionUser.email){
            const otp = generateOtp();
            const emailSent = await sentVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = {email}
                res.json({success:true, message:"OTP successfully sent", redirectUrl:"/verifyEmailOtp"}) //render changeEmailVerifyOtp
                console.log("OTP SEND",otp)                
            }else{
                console.log("Email not sent , something went wrong")
                res.redirect('/login')
            }
        }else{
            console.log("no user with given email id")
            res.json({success:false, message:"No user with given email id"})
        }
        }
    catch(error){
        console.error("error while changing the email",error)
        res.redirect('/pageNotFound')
    }
}

const loadVerifyEmailOtp = async(req,res)=>{
    try {
        let sessionUser= await User.findOne({_id:req.session.user});
        res.status(200).render('changeEmailVerifyOtp',{user:sessionUser})
        console.log("rendered change email verify otp page")
    } catch (error) {
        console.error("error while rendering the verify email otp page",error);
        res.redirect('/pageNotFound')       
    }
}

const verifyEmailOtp  =  async(req,res)=>{
    try{
        const enteredOtp = Number(req.body.otp);
        console.log(req.body.otp, req.session.userOtp)
        if(enteredOtp === req.session.userOtp){
            
            res.json({success:true, redirectUrl:"/changeEmailNew"})
        }else{
            console.log("error while validating the otp")
            res.json({success:false, message:"Invalid otp, please try again"})
        }
    }catch(error){
        console.error("error while verifying the otp",error)
        res.redirect('/pageNotFound')
    }
}

// to render the new email typing page
const loadChangeEmailNew = async (req,res)=>{
    try{
        const user= await User.findOne({email:req.session.userData.email})
        res.render('changeEmailNew',{user:user})
    }catch(error){
        console.error("error while rendering the change email new page",error)
        res.redirect('/pageNotFound')
    }
}


const updateEmail =async (req,res)=>{
    try{
        const {email} = req.body;
        const userId = req.session.user;
        const user = await User.findOneAndUpdate({_id:userId},{$set:{email:email}});
        req.session.userData = {email:email}
        if(user){
            console.log(" email updation successful")
            res.json({success:true, message:"Email successfully updated",redirectUrl:"/userProfile"})

        }else{
            console.log("unable to update email")
            res.json({success:false, message:"Email updatation failed"})
        }    
    }catch(error){
        console.error("error while changing the email",error)
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    loadChangeEmail,
    changeEmail,
    loadVerifyEmailOtp,
    verifyEmailOtp,
    loadChangeEmailNew,
    updateEmail
}