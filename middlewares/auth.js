const User = require("../models/userSchema");

const userAuth = (req,res,next) => {
    if(req.session.user){
        User.findOne({_id:req.session.user,isBlocked:false})
        .then(data=>{
            console.log(data)
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


// const adminAuth = (req,res,next) => {
//     User.findOne({isAdmin: true})
//     .then(data=>{    
//         if(data){
//             next();
//         }else{
//             res.redirect("/admin/login")
//         }
//     })
//     .catch(error=>{
//         console.log("Error in admin auth middleware");
//         res.status(500).send("Internal server error")
//     })
// }


const adminAuth = (req,res,next) => {
    console.log("Session", req.session.admin)
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
        res.redirect("/admin/login")

    }   
}



module.exports = {
    userAuth
    ,adminAuth
};