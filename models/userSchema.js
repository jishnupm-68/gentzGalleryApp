const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    name:{
        type : String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique:true
    },
    phone:{
        type :String,
        required: false,
        unique:false,
        sparse: true,
        default:null
    },
    googleId: {
        type:String,
         unique: true,
         sparse: true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type :Boolean,
        default:false
    },
    address:[{
        type:Schema.Types.ObjectId,
        ref:"address"
    }],
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0
    },
    walletHistory: [{
        transactionAmount: {
            type: Number,
            default:0,
            required: true
        },
        transactionDate: {
            type: Date,
            required: true
        },
        transactionType: {
            type: String,
            enum: ["Credit", "Debit"], // Determines the nature of the transaction
            required: true
        },
    }],
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now()
    },
    referalCode:{
        type:String
    },
    redeemed:{
        type:Boolean
    },
    redeemedUser:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]
})






const User =mongoose.model("User",userSchema);

module.exports = User;