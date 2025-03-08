const express = require('express');
const router = express.Router();
const passport = require("passport");

//controllers
//signupcontroler for  performing signup actions
const signupController = require("../controllers/user/signupController")
//login controller for performing login actions including google signup
const loginController = require("../controllers/user/loginController")
//address controller for rendering add address page and performing address operations
const addressController = require("../controllers/user/addressController") 
//home page controller for rendering home page and shop page also perform filter and search operations
const homePageController =require("../controllers/user/homePageController")
//email controller for changing the email in the user profile 
const emailController = require("../controllers/user/emailController")
//product controller for rendering product details page
const productController = require('../controllers/user/productController')
 //profile controller for rendering user profile page and performing change password operations
const profileController = require('../controllers/user/profileController')
//cart controller for rendering cart page, add, remove, update item from cart page 
const cartController = require("../controllers/user/cartController");
 //preOrder controller for rendering checkout page and performing pre order operations and payment verifications
const preOrderController = require("../controllers/user/preOrderController");
 //postOrder controller for rendering order details page and performing post order operations 
const postOrderController = require("../controllers/user/postOrderController");
// phone number controller for changing the phone number
const phoneNumberController = require('../controllers/user/phoneNumberController');
 //forgotPasswordController for rendering forgot password page and performing password reset operations
const forgotPasswordController = require("../controllers/user/forgotPasswordController");
//wishlistController for rendering wishlist page, add or remove item from page
const wishlistController = require("../controllers/user/wishlistController");               

// middleware for authentication
const {userAuth, profileAuth} = require("../middlewares/auth");

//load home , shopPage and filters
router.get('/', homePageController.loadHomePage)             // allowing user without login
router.get('/shop',homePageController.loadShopPage)          // allowing user without login
router.get('/filter',homePageController.filterProduct)      // allowing user without login
//Rendering the page not found page
router.get('/pageNotFound', homePageController.pageNotFound);

// user profile creation routes
router.get('/signup',signupController.loadSignup)
router.post('/signup', signupController.signup)
router.get('/verifyOtp',signupController.loadVerifyOtp)
router.post("/verifyOtp",signupController.verifyOtp)
router.post('/resendOtp', signupController.resendOtp)
router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))


//login
router.get('/login',loginController.loadLogin)
router.post('/login',loginController.login)
router.get('/logout',loginController.logout)
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}), loginController.googleLogin);

//profile Management starts here

//forgot passsword manager
router.get('/forgotPassword',forgotPasswordController.loadForgotPasswordPage)
router.post('/forgotPassword',forgotPasswordController.forgotEmailValid);
router.get('/verifyOtpForgotPassword',forgotPasswordController.loadForgotPasswordVerifyOtp)
router.post('/verifyForgotPasswordOtp',profileAuth,forgotPasswordController.verifyForgotPasswordOtp);
router.get("/changePassword",profileAuth,forgotPasswordController.loadChangePassword)
router.post("/resendOtpForgotPassword",profileAuth, forgotPasswordController.resendOtpForgotPassword)
router.post('/resetPassword',profileAuth,forgotPasswordController.resetPassword)

//referal setup
router.get('/generateReferal',userAuth, profileController.generateReferal);


//load user profilepage
router.get('/userProfile',userAuth,profileController.loadUserProfile)
//change password
router.get("/changePasswordFromProfile",userAuth,profileController.loadChangePasswordFromProfile)
router.post("/verifyEmail",userAuth,profileController.verifyEmail)
router.get("/loadChangeEmailVerifyOtpForPassword",userAuth,profileController.loadChangeEmailVerifyOtpForPassword)
router.post('/verifyEmailOtpForPassword', userAuth,profileController.verifyEmailOtpForPassword)
router.get("/changePasswordNew",userAuth,profileController.loadChangePasswordNew)
router.post('/updatePassword',userAuth,profileController.updatePassword)

//change email
router.get('/changeEmail', userAuth, emailController.loadChangeEmail)
router.post('/changeEmail',userAuth,emailController.changeEmail)
router.get('/verifyEmailOtp',userAuth,emailController.loadVerifyEmailOtp)
router.post('/verifyEmailOtp',userAuth,emailController.verifyEmailOtp)
router.get("/changeEmailNew",userAuth, emailController.loadChangeEmailNew)
router.post('/updateEmail',userAuth,emailController.updateEmail)

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

//preorder Management
router.get('/checkout', userAuth, preOrderController.getCheckoutPage);
router.post("/orderPlaced", userAuth, preOrderController.orderPlaced)
router.get('/deleteItemCheckout',userAuth,preOrderController.deleteItemCheckout);
router.post("/verifyPayment",userAuth,preOrderController.verifyPayment)
router.post("/useCoupon",userAuth,preOrderController.useCoupon)
router.post("/removeCoupon",userAuth,preOrderController.removeCoupon)

//postorder management
router.get("/orderDetails", userAuth, postOrderController.getOrderDetailsPage)
router.post("/cancelOrder", userAuth, postOrderController.cancelOrder)
router.post('/returnrequestOrder', userAuth, postOrderController.returnrequestOrder)
router.get("/downloadInvoice",userAuth, postOrderController.downloadInvoice)
router.post("/retryPayment", userAuth, postOrderController.retryPayment)

//wishlist management
router.get('/Wishlist',userAuth,wishlistController.loadWishlist)
router.get('/addToWishlist',wishlistController.addToWishlist)
router.get("/deleteWishlistItem",userAuth, wishlistController.deleteWishlistItem)

//exporting routes
module.exports = router  