const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const {userAuth, adminAuth} = require("../middlewares/auth");
const customerController =  require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const multer  =require("multer");
const storage = require('../helpers/multer');
const uploads = multer({storage: storage})
const brandController = require('../controllers/admin/brandController')



router.get("/pageError",adminController.pageError)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard)
//router.get('/',adminController.loadDashboard)
router.get('/dashboard',adminController.loadDashboard)
router.get('/logout',adminController.logout);


//customer management
router.get('/users', adminAuth, customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked)


//category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategory',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory', adminAuth,categoryController.getListCategory);
router.get("/unListCategory",adminAuth, categoryController.getUnListCategory)
router.get("/editCategory",adminAuth, categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth, categoryController.editCategory)


//brand management
//router.get("/brands",adminAuth,brandController.getBrandPage);
router.get("/brands",brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);



//product Management
//router.get("/addProducts",adminAuth, productController.getProductAddPage)


module.exports = router