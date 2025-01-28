
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart  = require("../../models/cartSchema");
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
        //currentOrder.forEach(order=>order.orderId= uuidv4());
        console.log("Order", currentOrder,"currentPage",currentPage,"totalPages",totalPages)
        res.render("orderList", {orders:currentOrder, currentPage:currentPage, totalPages:totalPages});
        
    } catch (error) {
        console.error("error while rendering the order deatails page",error);
        res.redirect("/admin/pageError");
    }
}



const updateOrderStatus = async (req,res)=>{
    try {
        const {orderId, status} = req.body;
        await Order.updateOne({_id:orderId},{$set:{status:status}});
        console.log("req body from updatingg order status", req.body)
        res.redirect("/admin/order");
        
    } catch (error) {
        console.error("Error while updating order status", error);
        res.status(500).redirect("/admin/pageError");
    }
}

const getOrderDetailsPageAdmin = async (req,res)=>{
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        //const addressId = req.session.addressId;
        const addressId  = await Order.findOne({_id:orderId},{address:1,_id:0});
        const aId= addressId.address
        console.log("addressId",addressId.address,aId,"orderId",orderId)
        const addressData = await Address.findOne({"address._id":aId});
        console.log("addressData",addressData)
        const findOrder = await Order.findOne({_id:orderId});
        const findUser = await User.findOne({_id:userId});
        const address =  addressData.address.find(addr =>addr._id.toString()===aId.toString());
        console.log("FindOrdeR:",findOrder,"address",address);
        let grandTotal = findOrder.finalAmount;
        let discount = findOrder.discount;
        let totalPrice = grandTotal-discount;

        

        res.render("orderDetailsAdmin",{
            orders: findOrder,
            user: findUser,
            totalGrand: totalPrice,
            grandTotal: grandTotal,
            discount: discount,
            finalAmount : totalPrice,
            address:address,
            //products: cartItems
        })
        console.log(req.session,req.body, req.params,req.query)
        
        
    } catch (error) {
        console.error("error while loading the order details page", error)
        res.redirect('/admin/pageError')
        
    }

}


const getStockPage = async (req,res)=>{
    try {
        const product = await Product.find({}).lean();
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(product.length/itemsPerPage);
        const currentProducts = product.slice(startIndex,endIndex);
        //currentOrder.forEach(order=>order.orderId= uuidv4());
        console.log("product", currentProducts,"currentPage",currentPage,"totalPages",totalPages)
        res.render("stock", {products:currentProducts, currentPage:currentPage, totalPages:totalPages});
        
    }
    catch (error) {
        console.error("error while loading the stock page", error)
        res.redirect('/admin/pageError')
        
    }
}


const addQuantity = async (req,res)=>{
    try {
        console.log(req.body)
        const { quantity, productId } = req.body;
        await Product.updateOne({_id: productId},{$inc:{quantity:quantity}});
        res.json({ status: true });

        
    } catch (error) {
        console.error("Error while adding quantity", error);
        res.status(500).redirect("/admin/pageError");
        
    }
    

}



module.exports = {
    loadOrders,
    updateOrderStatus,
    getOrderDetailsPageAdmin,
    getStockPage,
    addQuantity

}



























