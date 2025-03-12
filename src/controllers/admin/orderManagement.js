import Order from "../../models/orderSchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js"
import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";
import Wallet from "../../models/wallet.js";
import Address from "../../models/addressSchema.js";
import MESSAGES from "../../utils/adminConstants.js"

const loadOrder = async (req, res) => {
    try {
        const { search, page = 1 } = req.query;
        const limit = 10;

        const query = search
            ? {
                $or: [
                    { orderId: { $regex: search, $options: 'i' } },
                    { 'address.name': { $regex: search, $options: 'i' } },
                ],
            }
            : {};

        const orders = await Order.find(query)
            .populate({
                path: 'orderIteams.product',
                select: 'productName productImage price',
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

        const user = await User.findOne({ _id: orders[0]?.userId });

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const getStatusColor = (status) => ({
            Pending: 'pending',
            Processing: 'processing',
            Shipped: 'shipped',
            Delivered: 'delivered',
            Cancelled: 'cancelled',
            Returned: 'returned',
        }[status] || 'secondary');

        const formatDate = (date) =>
            new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

        res.render('order', {
            orders,
            currentPage: page,
            totalOrders,
            totalPages,
            search,
            getStatusColor,
            formatDate,
            user,
        });
    } catch (error) {
        console.error('Error fetching order info:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.REQUIRED_FIELD
            });
        }

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.INVALID_STATUS
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.ORDER_NOT_FOUND
            });
        }

        if (order.status === "Payment Pending") {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.ORDER_PAYMENT_PENDING
            });
        }

        if (order.status === 'Delivered') {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.ORDER_DELIVERED
            });
        }

        if (order.status === 'Cancelled' && status !== 'Cancelled') {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.ORDER_CANCELLED
            });
        }

        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            for (const item of order.orderIteams) {
                await Product.updateOne(
                    { _id: item.product._id, "colorVarients.color": item.color },
                    { $inc: { "colorVarients.$.quantity": item.quantity } }
                );
            }
        }

        order.status = status;
        order.orderIteams.forEach((order) => {
            if (order.status !== 'Cancelled') {
                order.status = status;
            }
        });
        order.statusUpdatedAt = new Date();

        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push({
            status: status,
            updatedAt: new Date(),
            updatedBy: req.admin ? req.admin._id : 'system'
        });

        await order.save();

        res.status(statusCode.OK).json({
            success: true,
            message: MESSAGES.ORDER_STATUS_UPDATED,
            data: {
                orderId: order._id,
                newStatus: status,
                updatedAt: order.statusUpdatedAt
            }
        });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

const orderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId })
            .populate({
                path: 'orderIteams.product',
                select: 'productName productImage price',
            })
            .populate({
                path: 'address', 
                populate: { path: 'userId', select: 'name email' }, 
            })
            .lean();

        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.ORDER_NOT_FOUND,
            });
        }

        res.render("orderdetails", { order });
    } catch (error) {
        console.log("Error retrieving order details:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR,
        });
    }
};

const handleReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, adminNote } = req.body;

        const validStatuses = ['Approved', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.RETURN_REQUEST_INVALID
            });
        }

        const order = await Order.findById(orderId)
            .populate('orderIteams.product');

        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.ORDER_NOT_FOUND
            });
        }

        if (!order.returnRequest || order.returnRequest.status !== 'Requested') {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.RETURN_REQUEST_INVALID
            });
        }

        order.returnRequest.status = status;
        order.returnRequest.adminResponse = {
            status: status,
            date: new Date(),
            note: adminNote
        };

        if (status === 'Rejected') {
            order.status = 'Rejected';
        }
        if (status === 'Approved') {
            order.status = 'Returned';

            for (const item of order.orderIteams) {
                try {
                    const product = await Product.findById(item.product._id);
                    if (!product) {
                        console.error(`Product not found: ${item.product._id}`);
                        continue;
                    }

                    await Product.updateOne(
                        {
                            _id: item.product._id,
                            "colorVarients.color": item.color
                        },
                        {
                            $inc: { "colorVarients.$.quantity": item.quantity }
                        }
                    );
                } catch (error) {
                    console.error(`Error updating product quantity: ${error.message}`);
                }
            }

            const wallet = await Wallet.findOne({ userId: order.userId });
            wallet.balance += order.finalAmount;
            wallet.transactions.push({
                type: "credit",
                amount: order.finalAmount,
                description: "Refund from Returned order",
                date: new Date(),
            });

            await wallet.save();
        }

        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push({
            status: order.status,
            updatedAt: new Date(),
            updatedBy: req.admin ? req.admin._id : 'system',
            note: `Return request ${status.toLowerCase()}. ${adminNote}`
        });

        await order.save();

        return res.status(statusCode.OK).json({
            success: true,
            message: status === 'Approved' ? MESSAGES.RETURN_REQUEST_APPROVED : MESSAGES.RETURN_REQUEST_REJECTED,
            order
        });

    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

export {
    loadOrder,
    updateOrderStatus,
    orderDetails,
    handleReturnRequest,
};