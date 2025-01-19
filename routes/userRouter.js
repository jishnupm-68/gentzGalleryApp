const express = require('express');
const router = express.Router();
const userController =require("../controllers/user/usercontrollers")
const passport = require("passport");
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const {userAuth, profileAuth} = require("../middlewares/auth");

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




//profile Management
router.get('/forgotPassword',profileController.loadForgotPasswordPage)
router.post('/forgotPassword',profileController.forgotEmailValid);
router.post('/verifyForgotPasswordOtp',profileAuth,profileController.verifyForgotPasswordOtp);
router.get("/changePassword",profileAuth,profileController.loadChangePassword)
router.post("/resendOtpForgotPassword",profileAuth, profileController.resendOtpForgotPassword)
router.post('/resetPassword',profileAuth,profileController.resetPassword)

router.get('/userProfile',userAuth,profileController.loadUserProfile)

router.get('/changeEmail', userAuth, profileController.loadChangeEmail)
router.post('/changeEmail',userAuth,profileController.changeEmail)
router.post('/verifyEmailOtp',userAuth,profileController.verifyEmailOtp)
router.get("/changeEmailNew",userAuth, profileController.loadChangeEmailNew)
router.post('/updateEmail',userAuth,profileController.updateEmail)

router.get("/changePasswordFromProfile",userAuth,profileController.loadChangePasswordFromProfile)
router.post("/verifyEmail",userAuth,profileController.verifyEmail)
router.post('/verifyEmailOtpForPassword', userAuth,profileController.verifyEmailOtpForPassword)
router.get("/changePasswordNew",userAuth,profileController.loadChangePasswordNew)
router.post('/updatePassword',userAuth,profileController.updatePassword)

//productMAangement
router.get('/productDetails',productController.productDetails)

module.exports = router  