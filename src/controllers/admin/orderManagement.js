import Order from "../../models/orderSchema.js";
import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";









const loadOrder = async (req, res) => {
    try {
        const { search, page = 1 } = req.query;
        const limit = 5;

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
            .populate({
                path:"address",
                select:'address'
            }) 
            .sort({ createdOn: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

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

        console.log("orders with details:", orders);
       
         res.render('order', {
            orders,
            currentPage: page,
            totalOrders,
            totalPages,
            search,
            getStatusColor,
            formatDate,
        });
    } catch (error) {
        console.error('Error fetching order info:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and status are required'
            });
        }

       
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
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

      
        // if (order.status === 'Cancelled') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot update cancelled order'
        //     });
        // }

        
        if (order.status === 'Delivered' && status !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change status of delivered order'
            });
        }

       
        order.status = status;
        
       
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
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};


const orderDetails = async (req,res) => {
    try {
        console.log("here");
        
        const id = req.params
    
        const order = await Order.findOne({_id:req.params.id}) .populate({
            path: 'orderIteams.product',
            select: 'productName productImage price',
        })
        .populate({
            path:"address",
            select:'address'
        }).lean();
        console.log("order is  getting",order)
        res.render("orderdetails",{order})
    } catch (error) {
        console.log("error is getting h" ,error);
        
    }
}
export{
    loadOrder,
    updateOrderStatus,
    orderDetails,

}



