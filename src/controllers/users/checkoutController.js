import User from "../../models/userSchema.js";

import Product from "../../models/productSchema.js";
import Address from "../../models/addressSchema.js";
import Wallet from "../../models/wallet.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import Cart from "../../models/cartSchema.js";
import mongoose from "mongoose";
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { console } from "inspector";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js"
import MESSAGES from "../../utils/userConstant.js";
// import { updateOrderStatus} from "../admin/orderManagement.js";
dotenv.config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const getChekout = async (req, res) => {
    try {
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');
        const user = req.session.user;
        //(user);

        const userDate = await User.findOne({ _id: user })
        // .populate("address");

        const cart = await Cart.findOne({ userId: user }).populate('items.ProductId');
        if (cart.items.length < 1) {
            res.redirect("/cart")
        }

        for (const item of cart.items) {
            const product = await Product.findOne({
                _id: item.ProductId._id,
                "colorVarients.color": item.colorVariant
            });

            const availableQuantity = product.colorVarients.find(
                variant => variant.color === item.colorVariant
            )?.quantity;

            if (availableQuantity < item.quantity) {
                return res.redirect("/cart?error=Insufficient+stock+for+" + encodeURIComponent(item.ProductId.productName));
            }
        }

        const address = await Address.findOne({ userId: user })
        if (!address) {
            return res.redirect("/addAddress")


        }

        const coupons = await Coupon.find({
            isList: true,
            userBy: { $nin: [user] }
        }).sort({ createdAt: -1 })

        //("coupons is getting:", coupons);

        if (!coupons) {
            //("no coupon is stored");

        }

        const wallet = await Wallet.findOne({ userId: user });

        const subTotal = cart.items.reduce((total, items) => total + items.totalPrice, 0)

        const taxAMount = (subTotal * 18) / 100;
        const finalAmount = subTotal + taxAMount
        res.render('checkout', {
            user: userDate,
            cart: cart,
            address: address,
            subTotal, finalAmount, taxAMount,
            successMessage: successMessage[0] || null,
            errorMessage: errorMessage[0] || null,
            coupons,
            wallet,
        });
        //('cart ll ninn ulla cart', cart);


    } catch (error) {
        console.error("error", error);
        res.redirect("/pageNotFound")

    }


}


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: MESSAGES.LOGIN_FAILED 
            });
        }

        const { selectedAddress, paymentMethod, selectedCoupon } = req.body;

        const cart = await Cart.findOne({ userId }).populate("items.ProductId");
        if (!cart || !cart.items.length) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.SOMETHING_WENT_WRONG
            });
        }

        for (const item of cart.items) {
            const product = await Product.findOne({
                _id: item.ProductId._id,
                "colorVarients.color": item.colorVariant
            });

            const availableQuantity = product.colorVarients.find(
                variant => variant.color === item.colorVariant
            )?.quantity;

            if (availableQuantity < item.quantity) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: `Insufficient stock for ${item.ProductId.productName}. Only ${availableQuantity} units are available in ${item.colorVariant} color.`
                });
            }
        }

        let totalPrice = cart.items.reduce((total, item) => {
            return total + (item.ProductId.salePrice * item.quantity);
        }, 0);

        let appliedCoupon = null;
        let discountAmount = 0;

        if (selectedCoupon) {
            appliedCoupon = await Coupon.findOne({
                name: selectedCoupon,
                expireOn: { $gt: new Date() },
                minimumPrice: { $lte: totalPrice }
            });

            if (!appliedCoupon) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: MESSAGES.INVALID_REFERRAL 
                });
            }

            discountAmount = appliedCoupon.offerPrice;
        }

        const TAX_RATE = 18;
        const taxAmount = (totalPrice * TAX_RATE) / 100;
        const finalAmount = totalPrice - discountAmount + taxAmount;

        if (paymentMethod === "wallet") {
            const wallet = await Wallet.findOne({ userId });

            if (!wallet) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: MESSAGES.SOMETHING_WENT_WRONG 
                });
            }
            if (wallet.balance < finalAmount) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: `Insufficient wallet balance. Your current balance is ₹${wallet.balance}.`
                });
            }

            wallet.balance -= finalAmount;
            wallet.transactions.push({
                type: "debit",
                amount: finalAmount,
                date: new Date(),
                description: "Payment for order"
            });
            wallet.debitHistory.push({
                amount: finalAmount,
                date: new Date(),
                description: "Payment for order",
            });
            await wallet.save();
        }

        if (paymentMethod === "Cash on Delivery" && finalAmount > 50000) {
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGES.INTERNAL_ERROR 
            });
        }

        const newOrder = new Order({
            userId,
            orderIteams: cart.items.map(item => ({
                product: item.ProductId._id,
                quantity: item.quantity,
                productName: item.ProductId.productName,
                productImage: item.ProductId.productImage,
                price: item.ProductId.salePrice,
                color: item.colorVariant
            })),
            totalPrice,
            discount: discountAmount,
            finalAmount,
            address: selectedAddress,
            paymentMethod,
            status: "Pending",
            couponApplied: !!appliedCoupon,
            couponCode: appliedCoupon?.name,
            statusHistory: [{
                status: "Pending",
                date: new Date(),
                comment: "Order placed"
            }]
        });

        await newOrder.save();

        if (appliedCoupon) {
            await Coupon.findByIdAndUpdate(
                appliedCoupon._id,
                {
                    $push: { userBy: userId },
                    $inc: { usageCount: 1 }
                }
            );
        }

        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        for (const item of cart.items) {
            await Product.updateOne(
                {
                    _id: item.ProductId._id,
                    "colorVarients.color": item.colorVariant
                },
                {
                    $inc: { "colorVarients.$.quantity": -item.quantity }
                }
            );
        }

        return res.status(statusCode.OK).json({
            success: true,
            message: "Order placed successfully",
            order: {
                orderId: newOrder._id,
                totalPrice,
                discountAmount,
                finalAmount,
                couponApplied: appliedCoupon?.name || null
            }
        });

    } catch (error) {
        console.error("Error in placeOrder:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR, 
            error: error.message
        });
    }
};
const checkoutAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId })
        console
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        // //('req.body :', req.body)
        const userAddress = await Address.findOne({ userId: userData._id })

        if (!userAddress) {
            const newAddress = new Address({
                userId: userId,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
            })
            await newAddress.save()

        } else {

            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone })
            await userAddress.save()

            // //('address saved too ');

        }


        return res.redirect('/checkout')
    } catch (error) {
        console.error("error in add address in chekout ", error);

        req.redirect("/pageNotFound")
    }
}



const orderCancel = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.SOMETHING_WENT_WRONG 
            });
        }

        if (order.status === 'Pending' || order.status === 'Processing') {
            if (order.couponApplied && order.couponCode) {
                await Coupon.findOneAndUpdate(
                    { name: order.couponCode },
                    { $pull: { userBy: userId } }
                );
            }

            order.status = "Cancelled";
            order.orderIteams.forEach((order) => {
                order.status = "Cancelled";
            });
            order.reason = req.body.reason;

            await order.save();

            for (const item of order.orderIteams) {
                await Product.updateOne(
                    {
                        _id: item.product,
                        "colorVarients.color": item.color
                    },
                    {
                        $inc: { "colorVarients.$.quantity": item.quantity }
                    }
                );
            }

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: 0,
                    transactions: [],
                    creditHistory: [],
                    debitHistory: [],
                });
                await wallet.save();
            }

            if (order.paymentMethod !== 'Cash on Delivery' || order.status !== "Payment Pending") {
                wallet.balance += order.finalAmount;
                wallet.transactions.push({
                    type: "credit",
                    amount: order.finalAmount,
                    description: "Refund from cancelled product",
                    date: new Date(),
                });
                wallet.creditHistory.push({
                    amount: order.finalAmount,
                    date: new Date(),
                    description: `Refund from cancelled order: ${order._id}`
                });
                await wallet.save();
            }

            return res.status(statusCode.OK).json({
                success: true,
                message: "Order cancelled successfully. Amount credited to wallet.",
                walletBalance: wallet.balance,
            });
        }

        return res.status(statusCode.OK).json({
            success: false,
            message: "Order cannot be cancelled in its current status"
        });

    } catch (error) {
        console.error("Error cancelling order:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.INTERNAL_ERROR, 
            error: error.message
        });
    }
};


const requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id: orderId,
            userId: userId,
            status: "Delivered"
        });

        if (!order) {
            return res.status(statusCode.OK).json({
                success: false,
                message: "Order not found or cannot be returned"
            });
        }

        if (order.couponApplied && order.couponCode) {
            await Coupon.findOneAndUpdate(
                { name: order.couponCode },
                { $pull: { userBy: userId } }
            );
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    status: 'Return Request',
                    returnRequest: {
                        status: 'Requested',
                        reason: reason,
                        requestDate: new Date(),
                        adminResponse: {
                            status: 'Pending',
                            date: null,
                            note: null
                        }
                    }
                }
            },
            { new: true }
        );

        return res.status(statusCode.OK).json({
            success: true,
            message: "Return request submitted successfully"
        });

    } catch (error) {
        console.error("Error in return request:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Error processing return request"
        });
    }
};

const orderSuccess = async (req, res) => {

    try {
        const userId = req.session.user;
        const orderId = req.query.orderId;
        // //("order i d ids getting", orderId);

        const order = await Order.findOne({ _id: orderId })
            .populate("address")
            .populate("orderIteams.product");

        if (!order) {
            // //("the order is not gerting");

            return res.redirect('/profile');
        }
        const address = await Address.findById(order.address)



        const userData = await User.findById(userId)

        res.render('order-successfully', {
            order,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error'),
            user: userData,
            address,
        });
    } catch (error) {
        console.error("Error in order success:", error);
        // req.flash('error', 'Something went wrong');
        res.redirect('/profile');
    }
}



const orderDetails = async (req, res) => {
    try {
        const systemOrderId = req.params.orderId;
        //("Looking for order with systemOrderId:", systemOrderId);

        const order = await Order.findOne({ orderId: systemOrderId })
            .populate("orderIteams.product")
            .populate("address");


        if (!order) {
           
            return res.redirect('/profile');
        } else

            res.render("order-details", {
                order,
                successMessage: req.flash('success'),
                errorMessage: req.flash('error')
            });

    } catch (error) {
        console.error('Error in order view:', error);
        req.flash('error', 'Error retrieving order details');
        res.redirect('/profile');
    }
};



const createRazorpayOrder = async (req, res) => {
    try {
        const { selectedCoupon, selectedAddress, orderId } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(statusCode.OK).json({ success: false, message: "User session expired or invalid" });
        }

        if (orderId) {
            const existingOrder = await Order.findById(orderId);
            if (!existingOrder) {
                return res.status(statusCode.OK).json({ success: false, message: "Order not found c" });
            }


            const order = await razorpayInstance.orders.create({
                amount: Math.round(existingOrder.finalAmount * 100),
                currency: 'INR',
                receipt: `retry_${existingOrder._id.toString().substring(0, 10)}`
            });

            return res.json({
                success: true,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                razorpayOrderId: order.id,
                amount: order.amount,
                orderId: existingOrder._id
            });
        }

        const cart = await Cart.findOne({ userId }).populate("items.ProductId");
        if (!cart || cart.items.length === 0) {
            return res.status(statusCode.OK).json({ success: false, message: "Your cart is empty" });
        }

        for (const item of cart.items) {
            if (!item.ProductId) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const colorVariant = item.ProductId.colorVarients.find(
                variant => variant.color === item.colorVariant
            );

            if (!colorVariant) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: `Color variant ${item.colorVariant} not found for product: ${item.ProductId.productName}`
                });
            }

            if (colorVariant.quantity < item.quantity) {
                return res.status(statusCode.OK).json({
                    success: false,
                    message: `Insufficient stock for product: ${item.ProductId.productName} in color ${item.colorVariant}. Only ${colorVariant.quantity} available.`
                });
            }
        }

        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        let discountAmount = 0;

        if (selectedCoupon) {
            //("Applying coupon: " + selectedCoupon);

            const coupon = await Coupon.findOne({ name: selectedCoupon, isList: true });
            if (coupon) {
                discountAmount = coupon.offerPrice;
            }
        }
        const TAX_RATE = 18;
        const taxAmount = (totalPrice * TAX_RATE) / 100;

        let finalAmount = totalPrice - discountAmount + taxAmount;
        //("Order calculation - total: " + totalPrice + ", discount: " + discountAmount + ", final: " + finalAmount);

        const receiptId = Math.random().toString(36).substring(2, 10);

        const orderOptions = {
            amount: Math.round(finalAmount * 100),
            currency: "INR",
            receipt: receiptId,
            payment_capture: 1
        };

        const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

        const newOrder = new Order({
            userId,
            orderIteams: cart.items.map(item => ({
                product: item.ProductId._id,
                quantity: item.quantity,
                productName: item.ProductId.productName,
                productImage: item.ProductId.productImage,
                price: item.ProductId.salePrice,
                color: item.colorVariant,
                status: "Pending",
                CategoryId: item.ProductId.category
            })),
            totalPrice,
            discount: discountAmount,
            finalAmount,
            address: selectedAddress,
            paymentMethod: 'razorpay',
            status: 'Pending',
            couponApplied: selectedCoupon ? true : false,
            couponCode: selectedCoupon,
            paymentDetails: {
                razorpayOrderId: razorpayOrder.id,
                createdAt: new Date()
            }
        });

        await newOrder.save();

        const stockUpdatePromises = cart.items.map(async (item) => {
            return await Product.findOneAndUpdate(
                {
                    _id: item.ProductId._id,
                    "colorVarients.color": item.colorVariant
                },
                {
                    $inc: { "colorVarients.$.quantity": -item.quantity }
                },
                { new: true }
            );
        });

        await Promise.all(stockUpdatePromises);

        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

        res.status(statusCode.OK).json({
            success: true,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            orderId: newOrder._id,
            discountAmount: discountAmount
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to create order" });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = req.body;

        const userId = req.session.user;
        if (!userId) {
            return res.status(statusCode.OK
            ).json({ success: false, message: "User session expired or invalid" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        // if (expectedSignature !== razorpaySignature) {
        //     return res.status(statusCode.OK
        // ).json({ success: false, message: "Invalid payment signature" });
        // }

        if (orderId) {
            const order = await Order.findById(orderId).populate("orderIteams.product");
            if (!order) {
                return res.status(statusCode.OK
                ).json({ success: false, message: "Order not found in razorpay" });
            }

            for (const item of order.orderIteams) {
                const product = await Product.findById(item.product);

                if (!product) {
                    return res.status(statusCode.OK
                    ).json({
                        success: false,
                        message: `Product not found: ${item.productName}`
                    });
                }

                const colorVariant = product.colorVarients.find(
                    variant => variant.color === item.color
                );

                if (!colorVariant) {
                    return res.status(statusCode.OK
                    ).json({
                        success: false,
                        message: `Color variant ${item.color} not found for product: ${item.productName}`
                    });
                }

                if (colorVariant.quantity < item.quantity) {
                    return res.status(statusCode.OK
                    ).json({
                        success: false,
                        message: `Insufficient stock for ${item.productName} (color: ${item.color}). Only ${colorVariant.quantity} available.`
                    });
                }

                await Product.updateOne(
                    {
                        _id: item.product,
                        "colorVarients.color": item.color
                    },
                    {
                        $inc: { "colorVarients.$.quantity": -item.quantity }
                    }
                );
            }

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                {
                    status: 'Pending',
                    'paymentDetails.razorpayOrderId': razorpayOrderId,
                    'paymentDetails.razorpayPaymentId': razorpayPaymentId,
                    'paymentDetails.razorpaySignature': razorpaySignature,
                    'paymentDetails.succeededAt': new Date(),
                    $push: {
                        statusHistory: {
                            status: 'Pending',
                            updatedAt: new Date(),
                            updatedBy: 'system',
                            note: 'Payment verified successfully'
                        }
                    }
                },
                { new: true }
            );

            return res.status(statusCode.OK).json({
                success: true,
                message: "Payment verified successfully",
                orderId: updatedOrder._id
            });
        } else {
            return res.status(statusCode.OK
            ).json({
                success: false,
                message: "Order ID is required"
            });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Payment verification failed",
            status: 'Payment Pending'
        });
    }
};



const handlePaymentDismissal = async (req, res) => {
    //("handlePaymentDismissal", 1)
    try {
        const { orderId, selectedAddress, selectedCoupon } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(statusCode.OK
            ).json({ success: false, message: "User session expired" });
        }

        if (orderId) {
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: 'Payment Pending' },
                { new: true }
            );
            return res.json({
                success: true,
                message: 'Order status updated',
                orderId: updatedOrder._id
            });
        }

        //("handlePaymentDismissal", 2)

        const cart = await Cart.findOne({ userId }).populate("items.ProductId");
        if (!cart || cart.items.length === 0) {
            return res.status(statusCode.OK
            ).json({ success: false, message: "Cart is empty" });
        }

        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        let discountAmount = 0;
        if (selectedCoupon) {
            const coupon = await Coupon.findOne({ name: selectedCoupon, isList: true });
            if (coupon) {
                discountAmount = coupon.offerPrice;
            }
        }
        // //("Payment dismissal - total: " + totalPrice + ", discount: " + discountAmount + ", final: " + finalAmount);


        let TAX_RATE = 18;
        let taxAmount = (totalPrice * TAX_RATE) / 100;
        const finalAmount = totalPrice - discountAmount + taxAmount;


        const newOrder = new Order({
            userId,
            orderIteams: cart.items.map(item => ({
                product: item.ProductId._id,
                quantity: item.quantity,
                productName: item.ProductId.productName,
                productImage: item.ProductId.productImage,
                price: item.ProductId.salePrice,
                color: item.colorVariant,
                status: "Pending"
            })),
            totalPrice,
            discount: discountAmount,
            finalAmount,
            address: selectedAddress,
            paymentMethod: 'razorpay',
            status: 'Payment Pending',
            couponApplied: selectedCoupon ? true : false,
            couponCode: selectedCoupon
        });
        ("handlePaymentDismissal", 4)

        await newOrder.save();
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
        res.json({
            success: true,
            message: 'Order created with pending status',
            orderId: newOrder._id
        });

    } catch (error) {
        console.error("Error in payment dismissal:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to handle payment dismissal" });
    }
};




const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({
            orderId: orderId,
            userId: userId
        });

        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Order not found" });
        }

        const orderItem = order.orderIteams.find(item => item._id.toString() === itemId);

        if (!orderItem) {
            return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Order item not found" });
        }

        if (!['Pending', 'Processing'].includes(orderItem.status)) {
            return res.status(statusCode.OK).json({ success: false, message: "This item cannot be cancelled in its current status" });
        }

        let refundAmount = orderItem.price * orderItem.quantity;
        let originalRefundAmount = refundAmount;

        if (order.couponApplied && order.couponCode) {
            const originalOrderTotal = order.orderIteams.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const coupon = await Coupon.findOne({ name: order.couponCode });

            if (coupon) {
                const discountPercentage = Math.min(coupon.offerPrice / originalOrderTotal, 1);
                refundAmount = refundAmount * (1 - discountPercentage);
            }

            const remainingTotal = order.orderIteams.reduce((sum, item) => {
                return item._id.toString() !== itemId && item.status !== "Cancelled"
                    ? sum + (item.price * item.quantity)
                    : sum;
            }, 0);

            if (remainingTotal < (coupon?.minimumPrice || 0)) {
                order.couponApplied = false;
                order.couponCode = null;
            }
        }

        console.log(`Before update: Order final amount: ${order.finalAmount}, Refund amount: ${refundAmount}`);
        
        order.finalAmount -= refundAmount;
        
        console.log(`After update: New final amount: ${order.finalAmount}`);

        orderItem.status = "Cancelled";
        orderItem.cancelReason = reason;

        await Product.updateOne(
            { _id: orderItem.product, "colorVarients.color": orderItem.color },
            { $inc: { "colorVarients.$.quantity": orderItem.quantity } }
        );

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: [],
                creditHistory: [],
                debitHistory: []
            });
        }

        if (order.status !== "Payment Pending") {
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                description: `Refund for cancelled item: ${orderItem.productName} (${order.couponApplied ? 'with coupon adjustment' : 'without coupon'})`,
                date: new Date()
            });

            wallet.creditHistory.push({
                amount: refundAmount,
                date: new Date(),
                description: `Refund for cancelled item in order: ${orderId}`
            });
            await wallet.save();
        }

        const activeItems = order.orderIteams.filter(item => item.status !== "Cancelled");
        if (activeItems.length === 0) {
            order.status = "Cancelled";
            if (order.couponApplied && order.couponCode) {
                await Coupon.findOneAndUpdate(
                    { name: order.couponCode },
                    { $pull: { userBy: userId } }
                );
            }
        }

        order.statusHistory.push({
            status: "Item Cancelled",
            updatedAt: new Date(),
            updatedBy: "User",
            note: `Item ${orderItem.productName} cancelled: ${reason}. Refund amount: ₹${refundAmount.toFixed(2)}`
        });

        console.log(`Final check before saving: Order final amount = ${order.finalAmount}`);
        await order.save();



        return res.status(statusCode.OK).json({
            success: true,
            message: "Item cancelled successfully",
            refundAmount: refundAmount.toFixed(2),
            walletBalance: wallet.balance.toFixed(2)
        });
    } catch (error) {
        console.error("Error cancelling order item:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Error in item cancellation",
            error: error.message
        });
    }
};

const fetchOrderData = async (req, res) => {

    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;

        const userData = await User.findById(userId);

        const orderData = await Order.findById(orderId);
        if (!orderData) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Order not found"
            });
        }
        //("111");

        const userAddress = await Address.findOne({ userId: userId });
        if (!userAddress) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Address with this user not found"
            });
        }
        //("1112");

        const addressData = userAddress.address.find(addr => orderData.address.toString() === addr._id.toString());
        //("1113");

        if (!addressData) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Address not found"
            });
        }
        //("1114");

        res.status(statusCode.OK).json({
            success: true,
            order: {
                ...orderData.toObject(),
                address: addressData,
            }, userData
        });

        //("orderData:", orderData);
        //("addressData:", addressData);

    } catch (error) {
        console.error("Error fetching order data:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error while fetching order data",
            error: error.message
        });
    }
};




export {

    getChekout,
    checkoutAddress,
    placeOrder,
    orderSuccess,
    orderDetails,
    orderCancel,
    createRazorpayOrder,
    verifyRazorpayPayment,
    requestReturn,
    cancelOrderItem,
    handlePaymentDismissal,
    fetchOrderData,

}