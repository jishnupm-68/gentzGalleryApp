
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
        const { name, email, phone, password, confirmPassword, referralId } = req.body;
        if (password !== confirmPassword) {
            console.log("Password donot match")
            return res.json({ success: false , message: "Password do not Match" });
        }
        const findUser = await User.findOne({ email });
        if (findUser) {
            console.log("User already exists")
            return res.json({ success: false, message: "User with this email already exists" });
        }
        const otp = generateOtp();
        const emailSent = await sentVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json({success:false, message:"Failed to send otp"});
        }
        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password, referralId};
        res.status(200).json({success:true, message:"Otp sent successfully", redirectUrl:"/verifyOtp"})
        console.log("OTP SENT", otp);
        return; 
    } catch (error) {
        console.error("signup error", error);
        res.status(500).render("pageNotFound"); 
    }
};

//render the verify otp page
const loadVerifyOtp = async (req,res)=>{
    try{
        console.log("rendering verify otp page for signup")
        return res.status(200).render("verifyOtp")
    }catch(error){
        console.log("Home page not loading : ",error)
        res.redirect('/pageNotFound')
    }
}

//function for verifying the otp and saving the USER profile
const verifyOtp = async (req,res)=>{
    try{
        let updateReferalUser;
        const {otp} = req.body;
        if(otp === req.session.userOtp){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password)
            const saveUserData  = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                googleId:new Date(),
                password: passwordHash
            })    
            if((user.referralId).length>0){
                 updateReferalUser = await User.findOneAndUpdate(
                    {referalCode:user.referralId},
                    {
                        $inc: { wallet: 100 },
                        $push: {
                            walletHistory: {
                                transactionDate: new Date(),
                                transactionAmount: 100,
                                transactionType: "Credit",
                            }
                        }
                    }
                )

                if(updateReferalUser){
                    saveUserData.wallet = 50; 
                    saveUserData.walletHistory = [
                        {
                            transactionDate: new Date(),
                            transactionAmount: 50,
                            transactionType: "Credit",
                        }
                    ];
                }else{
                    console.log("ReferalCode is wrong, account creation failed. ");
                    return res.json({success:false,message:"Wrong referal code, account creation failed", redirectUrl:'/signUp'})
                }
            }
            await saveUserData.save()
            req.session.user =saveUserData._id;
            if(updateReferalUser){
                console.log("OTP verified and account created successfully, Referal applied")
                return res.json({success:true, message:"OTP verified and account created successfully, Referal applied", redirectUrl :'/'})
            }else{
                console.log("OTP verified and account created successfully")
                return res.json({success:true, message:"OTP verified and account created successfully", redirectUrl :'/'})
            }  
        }else{
            console.log("Invalid otp, please try again")
            res.json({success:false, message:"Invalid otp, please try again"})
        }
    }catch(error){
        console.error("Error while verifying the otp", error);
        res.json({success:false, message:"An error occured"})
    }
}

//function for resending the otp
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
            console.log("Email otp not sent, something went wrong");
            res.status(500).json({success:false, message:"Failed to resend the otp Please try again"})
        }
    } catch (error) {
        console.error("Error while sending otp", error)
        res.status(500).json({success:false, message: "Internal server error, please try again"})    
    }
}

//exporting functions
module.exports={
    loadSignup,
    signup,
    loadVerifyOtp,
    verifyOtp,
    resendOtp,
}