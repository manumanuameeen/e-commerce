import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";
import Category from "../../models/categorySchema.js";
import Wishlist from "../../models/wishlistSchema.js";
import mongoose from 'mongoose';

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;

        // Check if productId exists
        if (!productId) {
            return res.redirect("/pageNotFound")
            console.log("the product id is not getting check that once again");

        }

        const product = await Product.findById(productId).populate("category");


        if (!product) {
            return res.status(400).json({
                status: true,
                messsage: "there is no product "
            })
        }

        const findCategory = product.category;
        console.log("Finding category:", findCategory);

        const findRelatedProduct = await Product.find({ category: findCategory._id }).limit(5);
        console.log("Related products found:", findRelatedProduct.length);


        const categoryOffer = findCategory ? findCategory.offer || 0 : 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        res.render("product-details", {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            categories: findCategory,
            findRelatedProduct,
        });

    } catch (error) {
        console.log("Error in product details:", error);
        res.redirect("/pageNotFound");
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        
       
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect("/login");
        }

        const wishlist = await Wishlist.findOne({ userId: userId }).populate("products.productId");
        
        
        const products = wishlist ? wishlist.products : [];

        res.render('wishlist', {
            user,
            wishlist: products
        });

    } catch (error) {
        console.error("Error in getWishlist:", error);
        res.status(500).send("Internal Server Error");
    }
}
const addWishlist = async (req, res) => {
    try {
        console.log("Product added to the cart");

        const userId = req.session.user;
        const user = await User.findOne({ _id: userId });

        if (!user) {
            console.log("User not found");
            return res.json({
                status: false,
                message: "User not found",
            });
        }

        const productId = req.body.productId;

      

        console.log("The product ID:", productId);

        const productExist = await Product.findById(productId);
        console.log("Product exists:", productExist);

        if (!productExist) {
            console.log("Product does not exist");
            return res.json({
                status: false,
                message: "Product does not exist",
            });
        }

        let wishlist = await Wishlist.findOne({ userId: userId });
        console.log("Wishlist:", wishlist);

        if (!wishlist) {
            console.log("Wishlist not found, creating a new wishlist");
            wishlist = new Wishlist({
                userId,
                products: [],
            });
        }

        if (wishlist.products.some((item) => item.productId.toString() === productId.toString())) {
            console.log("Product is already in the wishlist");
            return res.json({
                status: false,
                message: "The product is already in the wishlist",
            });
        }

        wishlist.products.push({ productId, addedAt: new Date() });
        await wishlist.save();

        res.json({
            status: true,
            message: "Product added to wishlist",
        });

    } catch (error) {
        console.log("Error:", error);

        res.json({
            status: false,
            message: "Error adding to wishlist",
        });
    }
};


const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

       

        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            return res.json({
                status: false,
                message: "Wishlist not found"
            });
        }

        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );

        await wishlist.save();

        return res.json({
            status: true,
            message: "Product removed from wishlist"
        });

    } catch (error) {
        console.error("Error removing from wishlist:", error);
        return res.json({
            status: false,
            message: "Error removing product from wishlist"
        });
    }
};

export {
    productDetails,
    getWishlist,
    addWishlist,
    removeFromWishlist,

};
