const mongoose = require("mongoose");
const {Schema} = mongoose;


const productSchema = new Schema({
    productName:{
        type:String,
        require:true
    },
    description:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        requierd:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true,
    },
    saleCount: {
         type: Number,
          default: 0 
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:true
    },
    color:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available", "out of stock", "Discountinued"],
        requierd:true,
        default: "Available"
    },
    rating: { 
        type: Number, 
        min: 0, 
        max: 5, 
        default: 0 
    },
    ratings: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            rating: {
                type: Number,
                min: 0,
                max: 5,
                required: true
            },
            comment: {
                type: String
            }
        }
    ]
}, {
    timestamps:true
});


const Product  = mongoose.model("Product", productSchema);

module.exports = Product;

