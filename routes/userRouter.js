const express = require('express');
const router = express.Router();
const passport = require("passport");

//controllers
const signupController = require("../controllers/user/signupController")
const loginController = require("../controllers/user/loginController")
const filterController = require("../controllers/user/filterController")
const addressController = require("../controllers/user/addressController")
const homePageController =require("../controllers/user/homePageController")
const emailController = require("../controllers/user/emailController")
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const cartController = require("../controllers/user/cartController");
const preOrderController = require("../controllers/user/preOrderController");
const postOrderController = require("../controllers/user/postOrderController");
const phoneNumberController = require('../controllers/user/phoneNumberController');
const forgotPasswordController = require("../controllers/user/forgotPasswordController");
const wishlistController = require("../controllers/user/wishlistController");

// middleware for authentication
const {userAuth, profileAuth} = require("../middlewares/auth");

//load home , shopPage and filters
router.get('/', homePageController.loadHomePage)
router.get('/shop',userAuth,homePageController.loadShopPage)
router.get('/filter',userAuth,filterController.filterProduct)
router.get("/filterPrice",userAuth,filterController.filterByPrice)
router.post('/search',userAuth,filterController.searchProducts)

// user profile creation routes
router.get('/signup',signupController.loadSignup)
router.post('/signup', signupController.signup)
router.get('/verifyOtp',signupController.loadVerifyOtp)
router.post("/verifyOtp",signupController.verifyOtp)
router.post('/resendOtp', signupController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')

// })

router.get('/pageNotFound', homePageController.pageNotFound);

//login
router.get('/login',loginController.loadLogin)
router.post('/login',loginController.login)
router.get('/logout',loginController.logout)
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}), loginController.googleLogin);

//profile Management
//forgot passsword manager
router.get('/forgotPassword',forgotPasswordController.loadForgotPasswordPage)
router.post('/forgotPassword',forgotPasswordController.forgotEmailValid);
router.get('/verifyOtpForgotPassword',forgotPasswordController.loadForgotPasswordVerifyOtp)
router.post('/verifyForgotPasswordOtp',profileAuth,forgotPasswordController.verifyForgotPasswordOtp);
router.get("/changePassword",profileAuth,forgotPasswordController.loadChangePassword)
router.post("/resendOtpForgotPassword",profileAuth, forgotPasswordController.resendOtpForgotPassword)
router.post('/resetPassword',profileAuth,forgotPasswordController.resetPassword)

//load user profilepage
router.get('/userProfile',userAuth,profileController.loadUserProfile)

//change email
router.get('/changeEmail', userAuth, emailController.loadChangeEmail)
router.post('/changeEmail',userAuth,emailController.changeEmail)
router.get('/verifyEmailOtp',userAuth,emailController.loadVerifyEmailOtp)
router.post('/verifyEmailOtp',userAuth,emailController.verifyEmailOtp)
router.get("/changeEmailNew",userAuth, emailController.loadChangeEmailNew)
router.post('/updateEmail',userAuth,emailController.updateEmail)

//change password
router.get("/changePasswordFromProfile",userAuth,profileController.loadChangePasswordFromProfile)
router.post("/verifyEmail",userAuth,profileController.verifyEmail)
router.get("/loadChangeEmailVerifyOtpForPassword",userAuth,profileController.loadChangeEmailVerifyOtpForPassword)
router.post('/verifyEmailOtpForPassword', userAuth,profileController.verifyEmailOtpForPassword)
router.get("/changePasswordNew",userAuth,profileController.loadChangePasswordNew)
router.post('/updatePassword',userAuth,profileController.updatePassword)

//change phone
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
router.get('/checkout', userAuth, preOrderController.getCheckoutPage);
router.post("/orderPlaced", userAuth, preOrderController.orderPlaced)
router.get('/deleteItemCheckout',userAuth,preOrderController.deleteItemCheckout);
router.get("/orderDetails", userAuth, postOrderController.getOrderDetailsPage)
router.post("/cancelOrder", userAuth, postOrderController.cancelOrder)
router.post('/returnrequestOrder', userAuth, postOrderController.returnrequestOrder)
router.post("/verifyPayment",userAuth,preOrderController.verifyPayment)
router.post("/useCoupon",userAuth,preOrderController.useCoupon)
router.post("/removeCoupon",userAuth,preOrderController.removeCoupon)
// router.post('confirmPayment',userAuth,preOrderController.confirmPayment)

//wishlist management
router.get('/Wishlist',userAuth,wishlistController.loadWishlist)
router.get('/addToWishlist',userAuth,wishlistController.addToWishlist)
router.get("/deleteWishlistItem",userAuth, wishlistController.deleteWishlistItem)


module.exports = router  