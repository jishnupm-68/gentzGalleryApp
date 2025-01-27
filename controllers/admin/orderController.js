
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const {v4:uuidv4} = require('uuid');

const env = require('dotenv').config();





const loadOrders = async (req,res)=>{
    try {
        const orders = await Order.find({}).sort({createdOn:-1}).lean();
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(orders.length/itemsPerPage);
        const currentOrder = orders.slice(startIndex,endIndex);
        currentOrder.forEach(order=>order.orderId= uuidv4());
        res.render("orderList", {orders:currentOrder, currentPage:currentPage, totalPages:totalPages});
        
    } catch (error) {
        console.error("error while rendering the order deatails page",error);
        res.redirect("/admin/pageError");
    }
}


module.exports = {
    loadOrders,

}



























