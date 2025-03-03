
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