const express = require('express');
const router = express.Router();
const signupController = require("../controllers/user/signupController")

const loginController = require("../controllers/user/loginController")
const filterController = require("../controllers/user/filterController")
const addressController = require("../controllers/user/addressController")
const userController =require("../controllers/user/usercontrollers")
const emailController = require("../controllers/user/emailController")
const passport = require("passport");
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const cartController = require("../controllers/user/cartController");
const orderController = require("../controllers/user/orderController");
const phoneNumberController = require('../controllers/user/phoneNumberController')
const {userAuth, profileAuth} = require("../middlewares/auth");

router.get('/', userController.loadHomePage)
router.get('/shop',userAuth,userController.loadShopPage)
//router.get('/shop',userController.loadShopPage)
router.get('/filter',userAuth,filterController.filterProduct)
//router.get('/filter',userController.filterProduct)
router.get("/filterPrice",userAuth,filterController.filterByPrice)
//router.post('/search',userAuth,userController.searchProducts)
router.post('/search',filterController.searchProducts)
// testing router.get('/',(req,res)=>{res.render('home')})

// user profile creation routes
router.get('/signup',signupController.loadSignup)
router.post('/signup', signupController.signup)
router.post("/verifyOtp",signupController.verifyOtp)
router.post('/resendOtp', signupController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')

// })



router.get('/pageNotFound', userController.pageNotFound);

//login
router.get('/login',loginController.loadLogin)
router.post('/login',loginController.login)
router.get('/logout',loginController.logout)
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}), loginController.googleLogin);




//profile Management
router.get('/forgotPassword',profileController.loadForgotPasswordPage)
router.post('/forgotPassword',profileController.forgotEmailValid);
router.get('/verifyOtpForgotPassword',profileController.loadForgotPasswordVerifyOtp)
router.post('/verifyForgotPasswordOtp',profileAuth,profileController.verifyForgotPasswordOtp);
router.get("/changePassword",profileAuth,profileController.loadChangePassword)
router.post("/resendOtpForgotPassword",profileAuth, profileController.resendOtpForgotPassword)
router.post('/resetPassword',profileAuth,profileController.resetPassword)

router.get('/userProfile',userAuth,profileController.loadUserProfile)

router.get('/changeEmail', userAuth, emailController.loadChangeEmail)
router.post('/changeEmail',userAuth,emailController.changeEmail)
router.get('/verifyEmailOtp',userAuth,emailController.loadVerifyEmailOtp)
router.post('/verifyEmailOtp',userAuth,emailController.verifyEmailOtp)
router.get("/changeEmailNew",userAuth, emailController.loadChangeEmailNew)
router.post('/updateEmail',userAuth,emailController.updateEmail)

router.get("/changePasswordFromProfile",userAuth,profileController.loadChangePasswordFromProfile)
router.post("/verifyEmail",userAuth,profileController.verifyEmail)
router.get("/loadChangeEmailVerifyOtpForPassword",userAuth,profileController.loadChangeEmailVerifyOtpForPassword)
router.post('/verifyEmailOtpForPassword', userAuth,profileController.verifyEmailOtpForPassword)
router.get("/changePasswordNew",userAuth,profileController.loadChangePasswordNew)
router.post('/updatePassword',userAuth,profileController.updatePassword)


router.get('/changePhone', userAuth, phoneNumberController.loadChangePhone)
router.get("/changePhoneVerifyOtp", userAuth, phoneNumberController.loadChangePhoneVerifyOtp)
router.post("/changePhone", userAuth, phoneNumberController.changePhoneEmailVerify)
router.post('/verifyPhoneOtp', userAuth, phoneNumberController.verifyPhoneOtp)
router.get("/changePhoneNew",userAuth, phoneNumberController.loadChangePhoneNew)
router.post('/updatePhone', userAuth, phoneNumberController.updatePhone)



//Address management
router.get("/addAddress",userAuth,addressController.loadAddAddress)
router.post("/addAddress", userAuth,addressController.postAddAddress)
router.get("/editAddress",userAuth,addressController.loadEditAddress)
router.post('/editAddress',userAuth,addressController.editAddress)
router.get('/deleteAddress', userAuth, addressController.deleteAddress)
//productMAangement
router.get('/productDetails',productController.productDetails)



//cart management
router.get('/cart',userAuth,cartController.getCartPage);
router.post('/addToCart',userAuth,cartController.addToCart);
router.get('/deleteItem',userAuth,cartController.deleteItem);
router.post('/changeQuantity',userAuth,cartController.changeQuantity)





//order Management
router.get('/checkout', userAuth, orderController.getCheckoutPage);
router.post("/orderPlaced", userAuth, orderController.orderPlaced)
router.get("/orderDetails", userAuth, orderController.getOrderDetailsPage)
router.post("/cancelOrder", userAuth, orderController.cancelOrder)
router.get('/deleteItemCheckout',userAuth,orderController.deleteItemCheckout);





module.exports = router  