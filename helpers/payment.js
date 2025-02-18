const User = require("../models/userSchema");
const Product = require('../models/productSchema');
const Address =  require('../models/addressSchema');
const Order = require('../models/orderSchema');
const Coupon = require('../models/couponSchema');
const Transaction = require('../models/transactionSchema');
const Cart = require('../models/cartSchema');
const mongoose = require("mongoose");
const env = require('dotenv').config();
const Razorpay  = require('razorpay');
const crypto = require("crypto");


var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

function generateRazorpay(orderId,totalPrice,callback){
    var options = {
        amount: totalPrice*100, 
        currency: "INR",
        receipt: orderId
      };
      instance.orders.create(options, function(err, order) {
        if(err){
            console.error("error in generate razorpay function",err)
        }else{
            callback(null,order)
        }
      });
}



module.exports = {
    generateRazorpay
}