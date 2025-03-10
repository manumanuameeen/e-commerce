import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js";
import MESSAGES from "../../utils/adminConstants.js";

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
        res.status(statusCode.INTERNAL_SERVER_ERROR).render('error', { message: MESSAGES.SERVER_ERROR });
    }
};

const createCoupon = async (req, res) => {
    try {
        const { name, offerPrice, minimumPrice, expireOn } = req.body;

        if (!name || !offerPrice || !minimumPrice || !expireOn) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.REQUIRED_FIELD,
            });
        }

        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.status(statusCode.CONFLICT).json({
                status: false,
                message: MESSAGES.COUPON_EXISTS,
            });
        }
        if (name.length < 3 || name.length > 50 || !/^[a-zA-Z0-9 ]+$/.test(name)) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_COUPON_NAME,
            });
        }

        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate) || expirationDate <= new Date()) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_EXPIRATION,
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0 || parsedOfferPrice > 10000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_DISCOUNT_AMOUNT,
            });
        }

        const parsedMinimumPrice = parseFloat(minimumPrice);
        if (isNaN(parsedMinimumPrice) || parsedMinimumPrice <= 0 || parsedMinimumPrice > 100000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_MINIMUM_AMOUNT,
            });
        }
        if (parsedOfferPrice >= parsedMinimumPrice) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.DISCOUNT_EXCEEDS_MINIMUM,
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
            message: MESSAGES.COUPON_ADDED,
            coupon: newCoupon,
        });
    } catch (error) {
        console.error("Error in createCoupon:", error);
        if (error.code === 11000) {
            return res.status(statusCode.CONFLICT).json({
                status: false,
                message: MESSAGES.COUPON_EXISTS,
            });
        }
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR,
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
                message: MESSAGES.COUPON_NOT_FOUND
            });
        }

        res.status(statusCode.OK).json({
            status: true,
            message: MESSAGES.COUPON_DELETED
        });

    } catch (error) {
        console.error("Error in delete coupon", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR
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
                message: MESSAGES.REQUIRED_FIELD
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0 || parsedOfferPrice > 10000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_DISCOUNT_AMOUNT,
            });
        }

        const parsedMinimumPrice = parseFloat(minimumPrice);
        if (isNaN(parsedMinimumPrice) || parsedMinimumPrice <= 0 || parsedMinimumPrice > 100000) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_MINIMUM_AMOUNT,
            });
        }

        if (parsedOfferPrice >= parsedMinimumPrice) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.DISCOUNT_EXCEEDS_MINIMUM,
            });
        }

        const expirationDate = new Date(expireOn);
        if (isNaN(expirationDate) || expirationDate <= new Date()) {
            return res.status(statusCode.BAD_REQUEST).json({
                status: false,
                message: MESSAGES.INVALID_EXPIRATION,
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
                message: MESSAGES.COUPON_NOT_FOUND
            });
        }

        res.status(statusCode.OK).json({
            status: true,
            message: MESSAGES.COUPON_UPDATED,
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Error in edit coupon:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

export { 
    loadCoupon,
    createCoupon,
    deleteCoupon,
    editCoupon
};