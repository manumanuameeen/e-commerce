import mongoose, { now } from "mongoose";
const { Schema } = mongoose;

import { v4 as uuidv4 } from "uuid";

const orderSchema = new Schema({

    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    orderIteams:[{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    invoiceDate: {
        type: Date,
        default: Date.now,

    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['razorpay', 'Cash on Delivery', 'wallet', 'paypal']
    },
    status: {
        type: String,
        required: true,
        enum: ["Pending", "Processing", "Shipped", "Deliverd", "Cancelled", "Return Request", "Returned"],

 
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true,
    },
    couponApplied: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

const Order = mongoose.model("Order", orderSchema)

export default Order;