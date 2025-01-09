const express = require('express');
const router = express.Router();
const userController =require("../controllers/user/usercontrollers")
const passport = require("passport");

router.get('/', userController.loadHomePage)
router.get('/signup',userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verifyOtp",userController.verifyOtp)
router.get('/pageNotFound', userController.pageNotFound);
router.post('/resendOtp', userController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})


module.exports = router  