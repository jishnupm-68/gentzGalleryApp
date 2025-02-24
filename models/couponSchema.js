const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true,
    },
    expireOn:{
        type:Date,
        required: true
    },
    percentageOffer:{
        type:Number,
        required:false,
        min: 0,
        max: 100,
        default: 0,
    },
    offeredPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }]
})


const Coupon = mongoose.model("Coupon",couponSchema)

module.exports = Coupon