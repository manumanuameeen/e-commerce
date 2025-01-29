
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Cart from "../../models/cartSchema.js";
const loadCart = async (req, res) => {
    try {
        if (!req.session.user) {
            res.redirect("/login");
        }

        const userId = req.session.user;
        console.log("user id from:", userId);

        const cart = await Cart.findOne({ userId: userId }).populate('items.ProductId', 'productName salePrice productImage colorVarients');
 
        console.log("cart from loadcart", cart);

        if (!cart) {
            return res.render("cart", {
                user: await User.findById(userId),
                cart: []
            });
        }

       
        cart.items = cart.items.filter(item => {
            const product = item.ProductId;
            const availableStock = product.colorVarients.find(variant => variant.color === item.color)?.quantity || 0;
            return availableStock > 0;
        });

        console.log("Filtered cart items:", cart.items);
        
        return res.render("cart", {
            user: await User.findById(userId),
            cart: cart.items
        });

    } catch (error) {
        console.log('Error loading cart:', error);
        return res.redirect("/pageNotFound");
    }
};







const addToCart = async (req, res) => {
    try {
        const { color, quantity = 1 } = req.body;  
        const productId = req.body.productId || req.query.productId;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ 
                status: false, 
                message: "Please login to add items to cart" 
            });
            res.redirect('/login')
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                status: false, 
                message: "Product not found" 
            });
        }

       
        if (!color) {
            return res.status(400).json({
                status: false,
                message: "Please select a color before adding the product to the cart"
            });
        }

       
        const availableStock = product.colorVarients.find(variant => variant.color === color)?.quantity || 0;
        if (quantity > availableStock) {
            return res.status(400).json({
                status: false,
                message: `Only ${availableStock} items are available in ${color} color`
            });
        }

        if (quantity > 5) {
            return res.status(400).json({
                status: false,
                message: "Maximum quantity allowed per product is 5"
            });
        }

        const price = product.salePrice;
        if (isNaN(price) || isNaN(quantity)) {
            return res.status(400).json({ 
                status: false, 
                message: "Invalid price or quantity" 
            });
        }

        const totalPrice = price * quantity;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

       
        const itemIndex = cart.items.findIndex(item =>
            item.ProductId.toString() === productId.toString() &&
            item.color === color
        );

        if (itemIndex > -1) {
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > 5) {
                return res.status(400).json({ 
                    status: false, 
                    message: "Maximum quantity allowed is 5 items" 
                });
            }

            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].totalPrice = newQuantity * price;
        } else {
            if (cart.items.length > 5) {
                return res.status(400).json({
                    status: false,
                    message: "Maximum quantity allowed is 5 items"
                });
            }

            const newItem = {
                ProductId: productId,
                color: color,  
                quantity: quantity,
                price: price,
                totalPrice: totalPrice
            };

            cart.items.push(newItem);
        }

        await cart.save();
        return res.status(200).json({ 
            status: true, 
            message: "Product added to cart successfully" 
        });

    } catch (error) {
        console.error("Error on adding cart:", error);
        return res.status(500).json({ 
            status: false, 
            message: error.message || "Internal Server Error" 
        });
    }
};


const updateCartQuantity = async (req, res) => {

    try {

        const { cartItemId } = req.params
        const { quantity } = req.body;

        const cart = await Cart.findOne({ userId: req.session.user });

        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);
            await cart.save();
            return res.json({
                status: true,
                removed: true,
                message: 'Item removed from cart'
            });
        }

        if (quantity > 5) {
            return res.status(400).json({
                status: false,
                message: 'Maximum quantity allowed is 5 items'
            });
        }

        const item = cart.items.find(item => item._id.toString() === cartItemId);
        if (item) {
            item.quantity = quantity;
            item.totalPrice = item.price * quantity;
            await cart.save();
            return res.json({ status: true, newTotal: item.totalPrice });
        }
        return res.status(404).json({ status: false, message: 'Item not found in cart' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Error updating cart' });
    }
}

const removeFromCart = async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const cart = await Cart.findOne({ userId: req.session.user });

        cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);
        await cart.save();
        return res.json({ status: true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Error removing item from cart' });
    }
};


export {
    loadCart,
    addToCart,
    updateCartQuantity,
    removeFromCart
}