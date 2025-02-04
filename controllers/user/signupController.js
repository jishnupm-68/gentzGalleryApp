const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")


//function for generating the otp
function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString()

}


//function for senting the otp via mail
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

//function for hashing the password
const securePassword =async (password)=>{
    try{
        const  passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){
        console.log("Error while hashing the password")
    }
}

//render the signup page
const loadSignup = async (req,res)=>{
    try{
        console.log("rendered the signup page")
        return res.status(200).render("signup")
    }
    catch(error){
        console.log("Home page not loading : ",error)
        res.redirect('/pageNotFound')
    }
}

// checking the input data and sent the verification mail
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

//function for verifying the otp and saving the USER profile
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
           
            await saveUserData.save()
            console.log("user data saved successfully")
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

module.exports={
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
}