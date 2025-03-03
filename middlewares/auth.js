const User = require("../models/userSchema");

//checking for customer loggedin or not  
const userAuth = (req,res,next) => {
    if(req.session.user){
        User.findOne({_id:req.session.user,isBlocked:false})
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware");
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect("/login")
    }
}

//Checking while doing the forgot password operations
const profileAuth = (req,res,next) => {
    try{
        if(req.session.userData){
            next();
        }else{
            res.redirect("/forgotPassword")
        }

    }catch(error){  
        console.log("Error in profile auth middleware");
        res.status(500).send("Internal server error")
    }
}

//checking for admin loggedin or not
const adminAuth = (req,res,next) => {
    if(req.session.admin){
        User.findOne({isAdmin: true})
        .then(data=>{    
            if(data){
                next();
            }else{
                res.redirect("/admin/login")
            }
        })
        .catch(error=>{
            console.log("Error in admin auth middleware");
            res.status(500).send("Internal server error")
        })    
    }else{
        res.redirect("/admin/login");
    }   
}

//exporting functions
module.exports = {
    userAuth,
    adminAuth,
    profileAuth
};