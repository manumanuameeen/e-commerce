
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";


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
            return res.redirect('/login')
        }

        const userId = req.session.user;

        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            return res.status(401).json({
                status: false,
                loginRequired: true,
                message: "User account is not accessible"
            });
        }

        const product = await Product.finDOne({_id:productId,isBlocked:false});
        if (!product) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }
const category = await Category.findById(product.category)

if(category.isListed === false){
    return res.status(400).json({success:false,message:"admin unlisted the category for some issues thank you "})
}
        if (!colorVariant) {
            return res.status(400).json({
                status: false,
                message: "Please select a color before adding the product to the cart"
            });
        }

        const colorData = product.colorVarients?.find(variant => variant.color === colorVariant);
        const availableStock = colorData ? colorData.quantity : 0;

        if (quantity > availableStock) {
            return res.status(400).json({
                status: false,
                message: `Only ${availableStock} items are available in ${colorVariant} color`
            });
        }

        if (quantity > 5) {
            return res.status(400).json({
                status: false,
                message: "Maximum quantity allowed per product is 5"
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
                return res.status(400).json({
                    status: false,
                    message: "Maximum quantity allowed is 5 items"
                });
            }

            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].totalPrice = newQuantity * price;
        } else {
            if (cart.items.length >= 5) {
                return res.status(400).json({
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
        return res.status(200).json({
            status: true,
            message: "Product added to cart successfully"
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const { quantity } = req.body;
        
   
        const cart = await Cart.findOne({ userId: req.session.user });
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: 'Cart not found'
            });
        }

        const cartItem = cart.items.find(item => item._id.toString() === cartItemId);
        if (!cartItem) {
            return res.status(404).json({
                status: false,
                message: 'Item not found in cart'
            });
        }

      
        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);
            await cart.save();
            return res.json({
                status: true,
                removed: true,
                message: 'Item removed from cart'
            });
        }

       
        const product = await Product.findById(cartItem.ProductId);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: 'Product not found'
            });
        }  
// console.log("123456789",product);

     
        const colorVariant = product.colorVarients.find(
            variant => variant.color === cartItem.colorVariant
        );

        if (!colorVariant) {
            return res.status(404).json({
                status: false,
                message: 'Color variant not found'
            });
        } 

      
        if (quantity > colorVariant.quantity) {
            return res.status(400).json({
                status: false,
                message: `Only ${colorVariant.quantity} items are available in ${cartItem.colorVariant} color`
            });
        }

       
        if (quantity > 5) {
            return res.status(400).json({
                status: false,
                message: 'Maximum quantity allowed is 5 items'
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
        return res.status(500).json({
            status: false,
            message: 'Error updating cart'
        });
    }
};


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