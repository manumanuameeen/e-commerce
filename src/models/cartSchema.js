import mongoose, { SchemaTypes } from "mongoose";
import User from "../models/userSchema.js";
import Product from "../models/productSchema.js";
const {Schema} = mongoose;



const cartSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true     
    },
    items:[{
       
        ProductId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            default:1,
            min:1
        },
       
        price:{
            type:Number,
            default:0,
        },
        totalPrice:{
            type:Number,
            default:0
        },
        status:{
            type:String,
           
            default:"Placed"
        },
        cancellationReason:{
            type:String,
            default:'none'
            
        },
        colorVariant: { 
            type: String,
            required: true
        }
    }]
},{timestamps:true})


const Cart = mongoose.model("Cart",cartSchema)

export default Cart;