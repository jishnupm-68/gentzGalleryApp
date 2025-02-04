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


// render the email confirmation page for changing the phone number
const loadChangePhone  = (req,res)=>{
    User.findById(req.session.user)
    .then(user=>{
        if(!user) throw {status:401, message:"User not found"};
        res.status(200).render("changePhoneEmailVerify",{user:user});
        console.log("change phone email verification page rendered")
    })
    .catch((error)=>{
        console.error("Error while rendering page, some internal error occured",error);
        res.redirect(301,'/pageNotFound');
    })
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
                //res.render("changePhoneVerifyOtp",{user:user});
                res.json({success:true, message:"Otp sent successfully", redirectUrl:"/changePhoneVerifyOtp"})
            }else{
                console.log("Email not sent , something went wrong");
                res.json({success:false, message:"Email not sent , something went wrong"})
                //res.redirect('/login');
            }
           
        }else{
            console.log("user not match")
           // return res.render("changePhoneEmailVerify",{user:user,message:"The given email id is not matching with your account"})
           res.json({success:false, message:"The given email id is not matching with your account"})
        }
    } catch (error) {
        console.error("error while changing phone number", error);
        res.redirect('/pageNotFound');
        
    }

}

const loadChangePhoneVerifyOtp = async (req,res)=>{
    try{
    const user = await User.findOne({_id:req.session.user});;
    res.render("changePhoneVerifyOtp",{user:user});
}
    catch(error){
        console.error("Error while rendering page, some internal error occured",error);
        res.redirect(301,'/pageNotFound');
    }
}

const verifyPhoneOtp =  (req,res)=>{ 
    const enteredOtp =  Number(req.body.otp);
    new Promise((resolve,reject)=>{
        if(enteredOtp === req.session.userOtp){
            resolve(true);
        }else{
            reject(new Error("Invalid Otp"));
        }
    })
    .then(()=>{
        res.status(200).json({success:true, redirectUrl:"/changePhoneNew"});
    })
    .catch((error)=>{
        console.log("error while validating the otp",error);
        res.json({success:false, message:"Invalid otp, please try again after some time"});
    })   
}

const  loadChangePhoneNew =  (req,res)=>{
    User.findOne({email:req.session.userData.email})
    .then((user)=>{
        console.log("New number adding page rendered");
        res.status(200).render("changePhoneNew",{user:user});
    })
    .catch ((error)=>{
    console.error("error while rendering the changePhoneNew page",error);
    res.redirect('/pageNotFound');
    })

}

const updatePhone =  (req,res)=>{
    console.log(req.body)
    const {phone}= req.body;
    const userId = req.session.user;

    new Promise((resolve,reject)=>{
        User.findByIdAndUpdate({_id:userId},{$set:{phone:phone}})
            .then((user)=>{
                if(!user){
                    reject(new Error("User not found"));
                }
                console.log("Phone number updated successfully");
                req.session.userData = {email:user.email};
                // resolve({
                //     success:true,
                //     message:"Phone number updated successfully",
                //     redirectUrl:"/userProfile"
                // })
                resolve(true)
            })
            .catch((error)=>{
                console.error("Error while updating the number", error),
                reject({
                    success:false,
                    message:"Phone number updatation failed",
                    redirectUrl:"/changePhoneNew"
                });
            })
    })
    .then(()=>{
        res.status(200).json({success:true, message:"Phone number updated successfully", redirectUrl:"/userProfile"});  
        console.log("success response shared")
    })
    .catch ((reject)=>{
        console.error("Error while updating the number", reject),
        res.status(500).json(reject);
    })
}

module.exports = {
    loadChangePhone,
    changePhoneEmailVerify,
    verifyPhoneOtp,
    loadChangePhoneNew,
    updatePhone,
    loadChangePhoneVerifyOtp
}