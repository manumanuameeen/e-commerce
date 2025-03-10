import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Offer from "../../models/offerScema.js";
import { postAddAddress } from "../users/profileController.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js";
import MESSAGES from "../../utils/adminConstants.js"

const addOffer = async (req, res) => {
    try {
        const { name, type, discount, productId, categoryId, referralCode, startDate, endDate } = req.body;

        if (discount <= 0 || discount > 100) {
            return res.status(statusCode.OK).json({ 
                success: false, 
                message: MESSAGES.INVALID_DISCOUNT 
            });
        }

        let offerData = new Offer({ 
            name, 
            type, 
            discount, 
            startDate, 
            endDate, 
            status: true 
        });

        if (type === 'product' && productId) {
            const product = await Product.findOne({ productName: productId });
            if (!product) {
                return res.status(statusCode.NOT_FOUND).json({ 
                    success: false, 
                    message: MESSAGES.PRODUCT_NOT_FOUND 
                });
            }
            
            offerData.productId = product._id;
            offerData.originalPrice = product.salePrice;
            
            const newOffer = await offerData.save();
            
            const bestDiscount = Math.max(discount, product.categoryOffer || 0);
            product.productOffer = discount;
            
            const discountedPrice = product.regularPrice - (product.regularPrice * bestDiscount / 100);
            product.salePrice = Number(discountedPrice.toFixed(2));
            
            await product.save();

            return res.status(statusCode.CREATED).json({ 
                success: true, 
                message: MESSAGES.OFFER_ADDED, 
                offer: newOffer 
            });
        } 
        
        if (type === 'category' && categoryId) {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(statusCode.NOT_FOUND).json({ 
                    success: false, 
                    message: MESSAGES.CATEGORY_NOT_FOUND 
                });
            }

            offerData.categoryId = categoryId;
            const newOffer = await offerData.save();
            
            const productsInCategory = await Product.find({ category: categoryId });
            
            for (let product of productsInCategory) {
                if (!offerData.originalPrice) {
                    offerData.originalPrice = product.salePrice;
                }
                
                const bestDiscount = Math.max(discount, product.productOffer || 0);
                product.categoryOffer = discount;
                
                const discountedPrice = product.regularPrice - (product.regularPrice * bestDiscount / 100);
                product.salePrice = Number(discountedPrice.toFixed(2));
                
                await product.save();
            }

            if (!category.offers) {
                category.offers = [];
            }
            category.offers.push(newOffer._id);
            await category.save();

            await offerData.save();

            return res.status(statusCode.CREATED).json({ 
                success: true, 
                message: MESSAGES.OFFER_ADDED, 
                offer: newOffer 
            });
        }

        return res.status(statusCode.OK).json({ 
            success: false, 
            message: MESSAGES.INVALID_OFFER_TYPE 
        });

    } catch (error) {
        console.error('Error in addOffer:', error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: MESSAGES.SERVER_ERROR 
        });
    }
};

const editOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId;
        const { discount, startDate, endDate } = req.body;

        if (discount <= 0 || discount > 100) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.INVALID_DISCOUNT
            });
        }

        const existingOffer = await Offer.findById(offerId);
        if (!existingOffer) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.OFFER_NOT_FOUND
            });
        }

        existingOffer.discount = discount;
        existingOffer.startDate = startDate;
        existingOffer.endDate = endDate;

        if (existingOffer.type === 'product') {
            const product = await Product.findById(existingOffer.productId);
            if (!product) {
                return res.status(statusCode.NOT_FOUND).json({
                    success: false,
                    message: MESSAGES.PRODUCT_NOT_FOUND
                });
            }

            const bestDiscount = Math.max(discount, product.categoryOffer || 0);
            product.productOffer = discount;
            
            const discountedPrice = product.regularPrice - (product.regularPrice * bestDiscount / 100);
            product.salePrice = Number(discountedPrice.toFixed(2));
            
            await product.save();

        } else if (existingOffer.type === 'category') {
            const category = await Category.findById(existingOffer.categoryId);
            if (!category) {
                return res.status(statusCode.NOT_FOUND).json({
                    success: false,
                    message: MESSAGES.CATEGORY_NOT_FOUND
                });
            }

            const productsInCategory = await Product.find({ category: existingOffer.categoryId });
            
            for (let product of productsInCategory) {
                const bestDiscount = Math.max(discount, product.productOffer || 0);
                product.categoryOffer = discount;
                
                const discountedPrice = product.regularPrice - (product.regularPrice * bestDiscount / 100);
                product.salePrice = Number(discountedPrice.toFixed(2));
                
                await product.save();
            }
        }

        const updatedOffer = await existingOffer.save();

        return res.status(statusCode.OK).json({
            success: true,
            message: MESSAGES.OFFER_UPDATED,
            offer: updatedOffer
        });

    } catch (error) {
        console.error('Error in editOffer:', error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

const removeOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId;
        
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: MESSAGES.OFFER_NOT_FOUND
            });
        }

        if (offer.type === "product") {
            const product = await Product.findById(offer.productId);
            if (product) {
                product.productOffer = 0;
                
                if (product.categoryOffer > 0) {
                    const discountedPrice = product.regularPrice - (product.regularPrice * product.categoryOffer / 100);
                    product.salePrice = Number(discountedPrice.toFixed(2));
                } else {
                    product.salePrice = product.regularPrice;
                }
                
                await product.save();
            }
        }

        if (offer.type === 'category') {
            const category = await Category.findById(offer.categoryId);
            if (category) {
                category.offers = category.offers.filter(id => id.toString() !== offerId);
                await category.save();
            }

            const productsInCategory = await Product.find({ category: offer.categoryId });
            for (let product of productsInCategory) {
                product.categoryOffer = 0;
                
                if (product.productOffer > 0) {
                    const discountedPrice = product.regularPrice - (product.regularPrice * product.productOffer / 100);
                    product.salePrice = Number(discountedPrice.toFixed(2));
                } else {
                    product.salePrice = product.regularPrice;
                }
                
                await product.save();
            }
        }

        await Offer.findByIdAndDelete(offerId);

        return res.status(statusCode.OK).json({ 
            success: true, 
            message: MESSAGES.OFFER_REMOVED 
        });

    } catch (error) {
        console.error('Error in removeOffer:', error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: MESSAGES.SERVER_ERROR 
        });
    }
};

const offerList = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalOffers = await Offer.countDocuments({ status: true });
        const totalPages = Math.ceil(totalOffers / limit);

        const offers = await Offer.find({ status: true })
            .skip(skip)
            .limit(limit);

        let productName = null;
        if (offers.length > 0 && offers[0].productId) {
            const product = await Product.findById(offers[0].productId);
            productName = product?.productName;
        }

        return res.render("offerLoad", { 
            offers,
            productName: productName || null,
            currentPage: page,
            totalPages: totalPages,
            totalOffers: totalOffers
        });
    } catch (error) {
        console.error('Error in offerList:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: MESSAGES.SERVER_ERROR 
        });
    }
};

const LoadOffer = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        const products = await Product.find({ isBlocked: false });
        const categories = await Category.find({ isListed: true });
        
        return res.render("offer", { products, categories });
    } catch (error) {
        console.error("Error in LoadOffer:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: MESSAGES.SERVER_ERROR 
        });
    }
};

export {
    LoadOffer,
    addOffer,
    offerList,
    removeOffer,
    editOffer,
};