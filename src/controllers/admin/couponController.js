import User from "../../models/userSchema.js";

import Order from "../../models/orderSchema.js";

import Coupon from "../../models/couponSchema.js";


const loadCoupon = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }

        const limit = 6;

        const coupons = await Coupon.find({ isList: true })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Coupon.countDocuments({ isList: true });

        res.render("coupon", {
            coupons,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.log("error in load coupon", error);
        res.status(500).render('error', { message: 'Failed to load coupons' });
    }
};

const createCoupon = async (req, res) => {
    try {
        const { name, offerPrice, minimumPrice, expireOn, } = req.body;


        if (!name || !offerPrice || !minimumPrice || !expireOn) {
            return res.status(400).json({
                status: false,
                message: "All fields are required!",
            });
        }


        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.status(400).json({
                status: false,
                message: "Coupon with this name already exists!",
            });
        }


        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate) || expirationDate <= new Date()) {
            return res.status(400).json({
                status: false,
                message: "Expiration date must be a future date!",
            });
        }


        const newCoupon = new Coupon({
            name,
            createdOn: Date.now(),
            offerPrice,
            minimumPrice,
            expireOn: expirationDate,
            isList: true,
           
        });


        await newCoupon.save();


        return res.status(200).json({
            status: true,
            message: "Coupon created successfully",
            coupon: newCoupon,
        });
        console.log("Coupon created successfully");

    } catch (error) {
        console.error("Error in createCoupon:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
        });
    }
};

const deleteCoupon = async (req, res) => {
    try { 
        const { couponId } = req.params;
        const coupon = await Coupon.findByIdAndDelete(couponId);
        
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully"
        });

    } catch (error) {
        console.error("Error in delete coupon", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
}


const editCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { offerPrice, minimumPrice, expireOn } = req.body;

        // Validate inputs
        if (!offerPrice || !minimumPrice || !expireOn) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        // Validate expiry date
        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expiration date!"
            });
        }

        // Update the coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                offerPrice,
                minimumPrice,
                expireOn: expirationDate
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Error in edit coupon:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export {
    loadCoupon,
    createCoupon,
    deleteCoupon,
    editCoupon,
    
}
