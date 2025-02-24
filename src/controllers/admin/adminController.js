import User from "../../models/userSchema.js";
import Coupon from "../../models/couponSchema.js";
import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
import bcrypt from "bcrypt"

import Order from "../../models/orderSchema.js";



const loadPageerror = async (req, res) => {
    try {
        return res.render("pageerror")
    } catch (error) {
        console.log("Error in pageerror ", error);


    }
}


const loadlogin = async (req, res) => {

    try {
        if (req.session.admin) {
            return res.redirect("/admin")
        }
        return res.render("admin-login", { message: null })
    } catch (error) {
        console.log('Error loading admin login:', error);
        res.status(500).send('Internal Server Error');

    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true })

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = admin._id
                return res.redirect('/admin')
            } else {
                return res.redirect("/admin//login")
            }

        } else {
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log("Login error", error)
        return res.redirect("/pageerror")
    }

}



const loadDashboard = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        const { startDate, endDate, reportType, page } = req.query;
        const currentPage = parseInt(page) || 1;
        const ordersPerPage = 5;

        const now = new Date();
        let startOfPeriod = new Date(now.setHours(0, 0, 0, 0));
        let endOfPeriod = new Date(now.setHours(23, 59, 59, 999));

       
        switch (reportType) {
            case 'weekly':
                startOfPeriod = new Date(now);
                startOfPeriod.setDate(now.getDate() - now.getDay());
                startOfPeriod.setHours(0, 0, 0, 0);
                endOfPeriod = new Date(now);
                endOfPeriod.setDate(startOfPeriod.getDate() + 6);
                endOfPeriod.setHours(23, 59, 59, 999);
                break;
            case 'monthly':
                startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'yearly':
                startOfPeriod = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endOfPeriod = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'custom':
                if (startDate && endDate) {
                    startOfPeriod = new Date(startDate);
                    startOfPeriod.setHours(0, 0, 0, 0);
                    endOfPeriod = new Date(endDate);
                    endOfPeriod.setHours(23, 59, 59, 999);
                }
                break;
        }

        const totalOrdersCount = await Order.countDocuments({
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
        });

        const totalPages = Math.ceil(totalOrdersCount / ordersPerPage);

        const orders = await Order.find({
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
        })
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * ordersPerPage)
            .limit(ordersPerPage)
            .populate('orderIteams.product')
            .lean();

        const allOrders = await Order.find({
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
        }).lean();

        const salesReport = allOrders.reduce((acc, order) => {
            acc.totalOrders += 1;
            acc.statusCounts[order.status] = (acc.statusCounts[order.status] || 0) + 1;


            if (order.status === 'Delivered') {
                acc.totalSales += order.totalPrice || 0;
                if (order.discount > 0 || order.couponApplied) {
                    acc.totalDiscounts += order.discount || 0;
                    acc.discountedOrders += 1;
                }
                acc.netSales += order.finalAmount || 0;
                acc.deliveredOrders += 1;
            }

            return acc;
        }, {
            totalSales: 0,
            totalDiscounts: 0,
            discountedOrders: 0,
            totalOrders: 0,
            deliveredOrders: 0,
            netSales: 0,
            statusCounts: {}
        });

        const processedOrders = orders.map(order => ({
            ...order,
            totalAmount: order.totalPrice,
            discount: order.discount || 0,
            finalAmount: order.finalAmount,
            couponCode: order.couponCode || 'None',
            items: order.orderIteams.map(item => ({
                ...item,
                productName: item.productName,
                productImage: item.productImage || [],
                productStatus: item.status,
                price: item.price,
                quantity: item.quantity,
                color: item.color
            }))
        }));

        
        const salesTrend = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
                    status: "Delivered"
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: reportType === 'yearly' ? "%Y-%m" : "%Y-%m-%d", 
                            date: "$createdAt" 
                        }
                    },
                    sales: { $sum: "$finalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    date: "$_id",
                    sales: { $round: ["$sales", 2] },
                    orders: 1,
                    _id: 0
                }
            }
        ]);
        
        const paymentMethods = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
                    status: "Delivered"
                }
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 },
                    total: { $sum: "$finalAmount" }
                }
            },
            {
                $project: {
                    method: "$_id",
                    count: 1,
                    total: { $round: ["$total", 2] },
                    _id: 0
                }
            }
        ]);
       

        const topProducts = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
                    status: "Delivered"
                }
            },
            { $unwind: "$orderIteams" },
            {
                $group: {
                    _id: "$orderIteams.productName",
                    sales: { $sum: { $multiply: ["$orderIteams.price", "$orderIteams.quantity"] } },
                    quantity: { $sum: "$orderIteams.quantity" }
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: "$_id",
                    sales: { $round: ["$sales", 2] },
                    quantity: 1,
                    _id: 0
                }
            }
        ]);
      


        const topCategories = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
                    status: "Delivered"
                }
            },
            { $unwind: "$orderIteams" },
            {
                $lookup: {
                    from: "products", // Ensure this matches your actual collection name
                    localField: "orderIteams.product",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } }, // Ensure products exist
            {
                $lookup: {
                    from: "categories", // Ensure this matches your actual categories collection
                    localField: "product.category",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: false } }, // Ensure categories exist
            {
                $group: {
                    _id: "$category._id",
                    categoryName: { $first: "$category.name" },
                    sales: { $sum: { $multiply: ["$orderIteams.price", "$orderIteams.quantity"] } },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 10 },
            {
                $project: {
                    categoryId: "$_id",
                    categoryName: 1,
                    sales: { $round: ["$sales", 2] },
                    orders: 1,
                    _id: 0
                }
            }
        ]);
        
      console.log(topCategories);
      
        
        const report = {
            ...salesReport,
            orders: processedOrders,
            statusCounts: salesReport.statusCounts
        };

        return res.render("adminDashboard", {
            report,
            reportType: reportType || 'daily',
            startDate: startDate || startOfPeriod.toISOString().split('T')[0],
            endDate: endDate || endOfPeriod.toISOString().split('T')[0],
            currentPage,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            nextPage: currentPage + 1,
            prevPage: currentPage - 1,
            lastPage: totalPages,
            pages: generatePageArray(currentPage, totalPages),
            salesTrend,
            paymentMethods ,
            topProducts,
            topCategories,
        
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        return res.redirect("/pageerror");
    }
};

function generatePageArray(currentPage, totalPages) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
        if (i < totalPages && i > 1) {
            range.push(i);
        }
    }
    range.push(totalPages);
    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
}



const logout = async (req, res) => {
    try {
        
        console.log("before", req.session?.admin);
        
        req.session.destroy((err) => {
            if (err) {
                console.log("Error destroying session", err);
                return res.redirect("/pageerror");  // Ensure only one redirect happens
            }
            return res.redirect("/admin/login");
        });

    } catch (error) {
        console.log("Unexpected Error:", error);
        return res.redirect("/pageerror");
    }
};




export {
    loadlogin,
    login,
    loadDashboard,
    loadPageerror,
    logout,

}