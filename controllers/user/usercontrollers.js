const { render } = require("../../app")
const env= require("dotenv").config();
const User = require('../../models/userSchema')
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")



const loadHomePage = async(req,res)=>{
    try{
        const user = req.session.user
        
        if(user){
            const userData = await User.findOne({_id:user})
            console.log(userData)
            return res.render("home",{user:userData})
        }
        else{
            return res.render("home")
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
            const passwordHash = await securePassword(user.password)

            const saveUserData  = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
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

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}


