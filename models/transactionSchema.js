const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    details:{
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true
        },
        orderRazorpayId:{
            type: String,
            //required: true
        },
        paymentId: {  
            type: String,  
            required: true
        },
        amount: {
            type: Number,  
            required: true
        },
        currency: {
            type: String,
            default: "INR"
        },
        paymentMethod: {
            type: String,
            enum: ["razorpay", "credit_card", "debit_card", "upi", "net_banking", "wallet",'cod'],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending"
        },
        transactionDate: {
            type: Date,
            default: Date.now
        },
        refundDetails: {
            refundId: String,  
            refundAmount: Number,
            refundDate: Date
        }
    },
    balance:{
        type: Number,
        default: 0
    }
    
});

module.exports = mongoose.model("Transaction", transactionSchema);
