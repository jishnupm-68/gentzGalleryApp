const mongoose = require('mongoose')
const {Schema} =  mongoose;

const orderSchema = new Schema({
    userId: {  // Add userId for direct association
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderedItems:[{
        
        product:{
            type:Schema.Types.ObjectId, //change
            ref:"Product",              //change
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },price:{
            type:Number,
            default:0
        },
        image:{             //new
            type:String,
            required:true
        },
        productStatus:{         //new
            type:String,
            required:true,
            enum:[
                'Pending',
                "Processing",
                "Confirmed",
                "Cancelled", 
                "Shipped",
                "Delivered",
                "Return Request",
                "Returned"
            ],
            default: "Pending"
        },
        productName:{
            type:String,
            required:true
        },
        paymentMethod: {
            type: String,
            enum: ["razorpay", "credit_card", "debit_card", "upi", "net_banking", "wallet",'cod'],
           
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending"
        },
        returnReason:{
            type:String,
        },
        returnStatus:{
            type:String,
        },
        refundDate:{
            type:Date,    
        },
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceDate:{
        type:Date,
        default: Date.now()
    },
    status:{
        type:String,
        required:true,
        enum:['Pending',
                "Processing",
                "Confirmed",
                "Cancelled", 
                "Shipped",
                "Delivered",
                "Return Request",
                "Returned"]
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
   payment:{
        type:String,
        required:true
    },
    orderId:{   //new
        type:String,
    },
    paymentId:{
        type:String,    //new
    },
    signature:{     //new
        type:String,
    },
    
})



const Order = mongoose.model("Order",orderSchema);

module.exports = Order