import Order from "../../models/orderSchema.js";
         






import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";
import Wallet from "../../models/wallet.js";
import Address from "../../models/addressSchema.js";


const loadOrder = async (req, res) => {
    try {

        //     if (!req.session.admin) {
        //     return res.redirect("/admin/login");
        // }




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
        console.log("orders with details:", orders);
        const user = await User.findOne({ _id: orders[0].userId })


        if (!user) {
            console.error("the user is not geting the error")
        }

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

        console.log(user);


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
        res.status(500
).send('Internal Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(200
).json({
                success: false,
                message: 'Order ID and status are required'
            });
        }

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(200
).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        for (const item of order.orderIteams) {
            console.log("item is getting", item)
        }

if(order.status==="Payment Pending"){
    return res.status(200
).json({
        success:false,
        message:"Payment Pending cannot be changed"
    })
}

        if (order.status === 'Delivered') {
            return res.status(200
).json({
                success: false,
                message: 'Delivered orders cannot be changed'
            });
        }
        if (order.status === 'Cancelled' && status !== 'Cancelled') {
            return res.status(200
).json({
                success: false,
                message: 'Cannot change status of cancelled order'
            });
        }

        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            for (const item of order.orderIteams) {
                const product = item.product;
                await Product.updateOne(
                    { _id: product._id, "colorVarients.color": item.color },
                    { $inc: { "colorVarients.$.quantity": item.quantity } }
                );
                console.log(`Product quantity saved after cancellation:${item.color}`);
            }
        }


        order.status = status;
        order.orderIteams.forEach((order) => {
            if (order.status !== 'Cancelled') {
                order.status = status;
            }
        })
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

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: {
                orderId: order._id,
                newStatus: status,
                updatedAt: order.statusUpdatedAt
            }
        });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500
).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};



const orderDetails = async (req, res) => {
    try {
        console.log("here");

        const { orderId } = req.params

        const order = await Order.findOne({ _id: orderId }).populate({
            path: 'orderIteams.product',
            select: 'productName productImage price',
        }).populate(
            "address"

        ).lean();
        console.log("order is  getting", order)
        res.render("orderdetails", { order })
    } catch (error) {
        console.log("error is getting h", error);

    }
}

const handleReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, adminNote } = req.body;


        const validStatuses = ['Approved', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(200
).json({
                success: false,
                message: 'Invalid return request status'
            });
        }

        const order = await Order.findById(orderId)
            .populate('orderIteams.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!order.returnRequest || order.returnRequest.status !== 'Requested') {
            return res.status(200
).json({
                success: false,
                message: 'Invalid return request state'
            });
        }

        order.returnRequest.status = status;
        order.returnRequest.adminResponse = {
            status: status,
            date: new Date(),
            note: adminNote
        };

        if (status === 'Rejected') {
            order.status = 'Rejected'
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

                    const colorVariant = product.colorVarients.find(cv => cv.color === item.color);
                    if (!colorVariant) {
                        console.error(`Color variant not found: ${item.color}`);
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




                    console.log(`Updated quantity for product ${item.product._id}, color ${item.color}`);
                } catch (error) {
                    console.error(`Error updating product quantity: ${error.message}`);
                }
            }

            const wallet = await Wallet.findOne({
                userId: order.userId
            })
            console.log(wallet);

            wallet.balance += order.finalAmount;
            wallet.transactions.push({
                type: "credit",
                amount: order.finalAmount,
                description: "Refund from Returned order",
                date: new Date(),
            });

            await wallet.save()
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





        return res.status(200).json({
            success: true,
            message: `Return request ${status.toLowerCase()} successfully`,
            order
        });

    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(500
).json({
            success: false,
            message: 'Error processing return request'
        });
    }
};


export {
    loadOrder,
    updateOrderStatus,
    orderDetails,
    handleReturnRequest,

}



