const express = require('express');
const router = express.Router();
const userController =require("../controllers/user/usercontrollers")
const passport = require("passport");
const productController = require('../controllers/user/productController')

router.get('/', userController.loadHomePage)
// testing router.get('/',(req,res)=>{res.render('home')})
router.get('/signup',userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verifyOtp",userController.verifyOtp)
router.get('/pageNotFound', userController.pageNotFound);
router.post('/resendOtp', userController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')

})

router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)




//productMAangement
router.get('/productDetails', productController.productDetails)
router.get('/shop',(req,res)=>{
    res.render('shopPage')
})
module.exports = router  