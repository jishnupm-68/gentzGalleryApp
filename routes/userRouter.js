const express = require('express');
const router = express.Router();
const userController =require("../controllers/user/usercontrollers")

router.get('/', userController.loadHomePage)
router.get('/pageNotFound', userController.pageNotFound);


module.exports = router  