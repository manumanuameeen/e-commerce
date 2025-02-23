import mongoose, { now, SchemaTypes } from "mongoose";
const {Schema} = mongoose;


const couponSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true,
        unique:true,
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true,
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true,
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true,
    },
    userBy:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }]
},{timestamps:true})

const Coupon = mongoose.model("Coupon",couponSchema)

export default Coupon;