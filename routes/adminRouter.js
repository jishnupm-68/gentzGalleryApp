const express = require('express');
const router = express.Router();

//middlewares
const { adminAuth} = require("../middlewares/auth");

//controllers
/*admin controller is for performing basics as rendering login page , dashboard and logout */
const adminController = require('../controllers/admin/adminController');        
/* customer controller is for viewing the customer and block or unblock the customer*/    
const customerController =  require('../controllers/admin/customerController')
/*category controller is for viewing the category and category related operations add/remove offer*/ 
const categoryController = require('../controllers/admin/categoryController')
 /*product controller is for viewing the product and product related operations add/remove/edit and offer */   
const productController = require('../controllers/admin/productController')
 /*order controller is for viewing the order and perform order related operations */
const orderController  = require('../controllers/admin/orderController')
 /*coupon controller is for viewing the coupon and perform coupon related operations */
const couponController = require('../controllers/admin/couponController')  
/*Salesreportcontroller is for viewing the sales report and perform related operations */     
const salesReportController = require('../controllers/admin/salesReportController')
 /*brand controller is for viewing the brand and perform brand related operations */
const brandController = require('../controllers/admin/brandController')
 /*stock controller is for viewing the stock and perform stock related operations */
const stockController = require('../controllers/admin/stockController')

const multer  =require("multer");
const storage = require('../helpers/multer');
const uploads = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2 MB
});

//rendering error page
router.get("/pageError", adminController.pageError)

//admin login logout and dashboard
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login);
router.get('/logout',adminAuth,adminController.logout);
//dashboard management
router.get('/',adminAuth,adminController.loadDashboard)

//sales report management
router.get('/salesReport', adminAuth, salesReportController.salesReport)
router.post("/generatePdf",adminAuth,salesReportController.generatePdf)
router.post('/downloadExcel', adminAuth,salesReportController.generateExcelReport)
router.get('/sales', adminAuth, salesReportController.displayFilteredData)
router.get('/salesSummary',adminAuth, salesReportController.salesSummary)

//customer management
router.get('/users', adminAuth, customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked)

//category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.get('/addCategory',adminAuth, categoryController.getAddCategory)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory', adminAuth,categoryController.getListCategory);
router.get("/unListCategory",adminAuth, categoryController.getUnListCategory)
router.get("/editCategory",adminAuth, categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth, categoryController.editCategory)

//brand management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);

//product Management
router.get("/addProducts",adminAuth, productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProducts)
router.get('/products',adminAuth,productController.getAllProducts)
router.post('/addProductOffer',adminAuth, productController.addProductOffer);
router.post("/removeProductOffer",adminAuth, productController.removeProductOffer);
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unBlockProduct',adminAuth,productController.unBlockProduct)
router.get('/editProduct',adminAuth, productController.getEditProduct);
router.post('/editProduct',adminAuth,uploads.array('images',4), productController.editProduct);
//delete image from edit product page
router.post('/deleteImage',adminAuth, productController.deleteSingleImage);

//coupon management
router.get('/coupon',adminAuth,couponController.loadCouponPage);
router.get('/addCoupon',adminAuth, couponController.loadAddCoupon);
router.post('/createCoupon',adminAuth,couponController.createCoupon);
router.get('/editCoupon',adminAuth, couponController.loadEditCoupon);
router.post('/updatecoupon',adminAuth,couponController.updateCoupon);
router.get('/deletecoupon',adminAuth,couponController.deleteCoupon);
router.get('/unlistcoupon',adminAuth,couponController.unlistCoupon);
router.get('/listcoupon',adminAuth,couponController.listCoupon);

//order Management
router.get("/order",adminAuth,orderController.loadOrders);
router.post("/updateOrderStatus",adminAuth,orderController.updateOrderStatus);
router.post("/updateReturnStatus",adminAuth,orderController.updateReturnStatus);
router.get('/orderDetails',adminAuth,orderController.getOrderDetailsPageAdmin);

//stockManagement
router.get('/stock',adminAuth,stockController.getStockPage)
router.post("/addQuantity", adminAuth,stockController.addQuantity);

//exporting routes
module.exports = router