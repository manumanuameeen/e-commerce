import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js";
import MESSAGES from "../../utils/userConstant.js"; 

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log("User ID:", userId);

        if (!userId) {
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId }).populate('items.ProductId');

        console.log("Cart Items:", cart?.items || []);

        return res.render("cart", {
            user: await User.findById(userId),
            cart: cart ? cart.items : []
        });

    } catch (error) {
        console.error('Error loading cart:', error);
        return res.redirect("/pageNotFound");
    }
};

const addToCart = async (req, res) => {
    try {
        const { colorVariant, quantity = 1 } = req.body;
        const productId = req.body.productId || req.query.productId;

        if (!req.session.user) {
            return res.status(statusCode.UNAUTHORIZED).json({
                status: false,
                loginRequired: true,
                message: MESSAGES.LOGIN_REQUIRED
            });
        }

        const userId = req.session.user;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.USER_NOT_FOUND
            });
        }
        if (user.isBlocked) {
            return res.status(statusCode.UNAUTHORIZED).json({
                status: false,
                message: MESSAGES.USER_BLOCKED
            });
        }

        const product = await Product.findOne({ _id: productId, isBlocked: false });
        if (!product) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        const category = await Category.findById(product.category);
        if (category.isListed === false) {
            return res.status(statusCode.OK).json({
                success: false,
                message: MESSAGES.CATEGORY_UNLISTED
            });
        }

        if (!colorVariant) {
            return res.status(statusCode.OK).json({
                status: false,
                message: MESSAGES.REQUIRED_FIELD
            });
        }

        const colorData = product.colorVarients?.find(variant => variant.color === colorVariant);
        const availableStock = colorData ? colorData.quantity : 0;

        if (quantity > availableStock) {
            return res.status(statusCode.OK).json({
                status: false,
                message: `${MESSAGES.INSUFFICIENT_STOCK}: Only ${availableStock} items available in ${colorVariant} color`
            });
        }

        if (quantity > 5) {
            return res.status(statusCode.OK).json({
                status: false,
                message: MESSAGES.INVALID_MINIMUM_AMOUNT
            });
        }

        const price = product.salePrice;
        const totalPrice = price * quantity;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.ProductId.toString() === productId.toString() &&
            item.colorVariant === colorVariant
        );

        if (itemIndex > -1) {
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > 5) {
                return res.status(statusCode.OK).json({
                    status: false,
                    message: MESSAGES.INVALID_MINIMUM_AMOUNT
                });
            }

            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].totalPrice = newQuantity * price;
        } else {
            if (cart.items.length >= 5) {
                return res.status(statusCode.OK).json({
                    status: false,
                    message: "Maximum 5 unique items allowed in the cart"
                });
            }

            cart.items.push({
                ProductId: productId,
                colorVariant,
                quantity,
                price,
                totalPrice
            });
        }

        await cart.save();
        return res.status(statusCode.OK).json({
            status: true,
            message: MESSAGES.PRODUCT_ADDED
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        const cart = await Cart.findOne({ userId: req.session.user });
        if (!cart) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.CART_EMPTY
            });
        }

        const cartItem = cart.items.find(item => item._id.toString() === cartItemId);
        if (!cartItem) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.NOT_FOUND
            });
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);
            await cart.save();
            return res.json({
                status: true,
                removed: true,
                message: "Item removed from cart"
            });
        }

        const product = await Product.findById(cartItem.ProductId);
        if (!product) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        const colorVariant = product.colorVarients.find(
            variant => variant.color === cartItem.colorVariant
        );

        if (!colorVariant) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.NOT_FOUND
            });
        }

        if (quantity > colorVariant.quantity) {
            return res.status(statusCode.OK).json({
                status: false,
                message: `${MESSAGES.INSUFFICIENT_STOCK}: Only ${colorVariant.quantity} items available in ${cartItem.colorVariant} color`
            });
        }

        if (quantity > 5) {
            return res.status(statusCode.OK).json({
                status: false,
                message: MESSAGES.INVALID_MINIMUM_AMOUNT
            });
        }

        cartItem.quantity = quantity;
        cartItem.totalPrice = product.salePrice * quantity;
        await cart.save();

        return res.json({
            status: true,
            newTotal: cartItem.totalPrice.toFixed(2)
        });

    } catch (error) {
        console.error('Update cart error:', error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const cart = await Cart.findOne({ userId: req.session.user });

        if (!cart) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.CART_EMPTY
            });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);
        await cart.save();
        return res.json({ 
            status: true,
            message: "Item removed from cart successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

export {
    loadCart,
    addToCart,
    updateCartQuantity,
    removeFromCart
};