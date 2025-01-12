const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const loadLogin = (req,res)=>{

    if(req.session.admin){
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin', {message:null});

}



const login =  async(req,res)=>{

    try {
        
        const {email, password} = req.body;
        console.log(req.body)
        const admin = await User.findOne({email, isAdmin:true})
        if(admin){
            const passwordMatch = bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin =  true;
                return res.redirect('/admin')
            }else{
                return res.redirect('/admin/login')
            }
        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.error("Error while login", error)
        return res.redirect('/pageError')
        
        
    }
}



const loadDashboard =  async (req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashboard')
            
        } catch (error) {
            res.redirect('pageError')
            
        }
    }
    
}











const pageError = (req,res)=>{
    res.render('adminError')
}


const logout = async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log("Error while destroying session",err.message)
                return res.redirect("/pageNotFound")
            }
            console.log("after", res.session)
            return res.redirect('/admin/login')
        })
    }catch(error){
        console.log("Unexpected Error during logout", error)
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout

}