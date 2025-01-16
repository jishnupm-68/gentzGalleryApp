const express = require('express');
const router = express.Router();
const userController =require("../controllers/user/usercontrollers")
const passport = require("passport");
const productController = require('../controllers/user/productController')
const {userAuth} = require("../middlewares/auth");

router.get('/', userController.loadHomePage)
router.get('/shop',userAuth,userController.loadShopPage)
//router.get('/shop',userController.loadShopPage)
router.get('/filter',userAuth,userController.filterProduct)
//router.get('/filter',userController.filterProduct)
router.get("/filterPrice",userAuth,userController.filterByPrice)
//router.post('/search',userAuth,userController.searchProducts)
router.post('/search',userController.searchProducts)
// testing router.get('/',(req,res)=>{res.render('home')})

// user profile creation routes
router.get('/signup',userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verifyOtp",userController.verifyOtp)
router.get('/pageNotFound', userController.pageNotFound);
router.post('/resendOtp', userController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')

// })

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}), userController.googleLogin);



router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)




//productMAangement
router.get('/productDetails', userAuth,productController.productDetails)

module.exports = router  