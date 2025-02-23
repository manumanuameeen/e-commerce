import mongoose, { now } from "mongoose";
const { Schema } = mongoose;
import { v4 as uuidv4 } from "uuid";

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    orderIteams: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        productImage: {
            type: [String],
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        color: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Pending"
        },
        cancelReason: {
            type: String
        },
        CategoryId:{
            type:Schema.Types.ObjectId,
            required:false,
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
        default: Date.now
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['razorpay', 'Cash on Delivery', 'wallet']
    },
    paymentDetails: {
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        failureReason: String,
        succeededAt: Date,
        attempts: [{
            razorpayOrderId: String,
            razorpayPaymentId: String,
            failureReason: String,
            attemptedAt: Date
        }]
    },
    status: {
        type: String,
        required: true,
        enum: ["Pending", "Payment Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Request", "Returned", "Rejected"]
    },
    reason: {
        type: String,
        required: false
    },
    returnRequest: {
        status: {
            type: String,
            enum: ['None', 'Requested', 'Approved', 'Rejected'],
            default: 'None'
        },
        reason: String,
        requestDate: Date,
        adminResponse: {
            status: String,
            date: Date,
            note: String
        }
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String,
        default: null
    },
    statusHistory: [
        {
            status: {
                type: String
            },
            updatedAt: {
                type: Date
            },
            updatedBy: {
                type: String
            },
            note: {
                type: String
            }
        }
    ]
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;
