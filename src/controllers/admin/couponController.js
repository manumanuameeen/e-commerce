import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js"

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
        res.status(statusCode.INTERNAL_SERVER_ERROR).render('error', { message: 'Failed to load coupons' });
    }
};

const createCoupon = async (req, res) => {
    try {
        const { name, offerPrice, minimumPrice, expireOn } = req.body;

        if (!name || !offerPrice || !minimumPrice || !expireOn) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "All fields are required!",
            });
        }

        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.status(statusCode.CONFLICT).json({
                status: false,
                message: "Coupon with this name already exists!",
            });
        }
        if (name.length < 3 || name.length > 50 || !/^[a-zA-Z0-9 ]+$/.test(name)) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Coupon name must be between 3 and 50 characters and contain only alphanumeric characters",
            });
        }

        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate) || expirationDate <= new Date()) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Expiration date must be a future date!",
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0 || parsedOfferPrice > 10000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Discount amount must be a positive number and less than ₹10,000",
            });
        }

        const parsedMinimumPrice = parseFloat(minimumPrice);
        if (isNaN(parsedMinimumPrice) || parsedMinimumPrice <= 0 || parsedMinimumPrice > 100000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Minimum purchase amount must be a positive number and less than ₹100,000",
            });
        }
        if (parsedOfferPrice >= parsedMinimumPrice) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Discount amount must be less than minimum purchase amount",
            });
        }

        const newCoupon = new Coupon({
            name,
            createdOn: Date.now(),
            offerPrice: parsedOfferPrice,
            minimumPrice: parsedMinimumPrice,
            expireOn: expirationDate,
            isList: true,
        });

        await newCoupon.save();

        console.log("Coupon created successfully");

        return res.status(statusCode.CREATED).json({
            status: true,
            message: "Coupon created successfully",
            coupon: newCoupon,
        });
    } catch (error) {
        console.error("Error in createCoupon:", error);
        if (error.code === 11000) {
            return res.status(statusCode.CONFLICT).json({
                status: false,
                message: "Coupon with this name already exists!",
            });
        }
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const deleteCoupon = async (req, res) => {
    try { 
        const { couponId } = req.params;
        const coupon = await Coupon.findByIdAndDelete(couponId);
        
        if (!coupon) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: "Coupon not found"
            });
        }

        res.status(statusCode.OK).json({
            status: true,
            message: "Coupon deleted successfully"
        });

    } catch (error) {
        console.error("Error in delete coupon", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Something went wrong"
        });
    }
};

const editCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { offerPrice, minimumPrice, expireOn } = req.body;

        if (!offerPrice || !minimumPrice || !expireOn) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "All fields are required!"
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0 || parsedOfferPrice > 10000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Discount amount must be a positive number and less than ₹10,000",
            });
        }

        const parsedMinimumPrice = parseFloat(minimumPrice);
        if (isNaN(parsedMinimumPrice) || parsedMinimumPrice <= 0 || parsedMinimumPrice > 100000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Minimum purchase amount must be a positive number and less than ₹100,000",
            });
        }

        if (parsedOfferPrice >= parsedMinimumPrice) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Discount amount must be less than minimum purchase amount",
            });
        }

        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate) || expirationDate <= new Date()) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: "Expiration date must be a future date!",
            });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                offerPrice: parsedOfferPrice,
                minimumPrice: parsedMinimumPrice,
                expireOn: expirationDate
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: "Coupon not found"
            });
        }

        res.status(statusCode.OK).json({
            status: true,
            message: "Coupon updated successfully",
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Error in edit coupon:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export { loadCoupon,
     createCoupon,
      deleteCoupon,
       editCoupon
    
    };
