
const User = require('../../models/userSchema')
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

// function for login 
const login = async(req,res)=>{
    try {
        const {email,password} = req.body
        const findUser = await User.findOne({isAdmin:false, email:email});
        if(!findUser){
            console.log("User not found")
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            console.log("User is blocked by admin")
            return res.render("login",{message:"User is blocked by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            console.log("Incorrect Password")
            return res.render("login",{message:"Incorrect Password"});
        }
        console.log("manual login")
        req.session.user = findUser._id;
        res.redirect('/')
    } catch (error) {
        console.log("Login error", error);
        res.render("login",{message:"Login failed, please try again after some time"})       
    }
}

// function for logout
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

// function for google login
const googleLogin = async (req,res)=>{
    try{
        const userEmail= req.user.email;       
        const user = await User.findOne({isAdmin:false,email:userEmail});
        if(!user){
            return res.render("login",{message:"User not found"})
        }
        if(user.isBlocked){
            res.render("login",{message:"User is blocked by admin"})
        }    
        req.session.user = user._id;
        res.redirect('/')
    }
    catch(error){
        console.error("error while logging in with google",error)
        res.redirect("/pageNotFound")
    }
}

//exporting modules
module.exports= {
    loadLogin,  
    login,
    logout,
    googleLogin,
}