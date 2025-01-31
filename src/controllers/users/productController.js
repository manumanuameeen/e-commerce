import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";
import Category from "../../models/categorySchema.js";

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;

        // Check if productId exists
        if (!productId) {
            return res.status(400).render("pageNotFound");
        }

        const product = await Product.findById(productId).populate("category");

       
        if (!product) {
            return res.status(404).render("pageNotFound");
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

export { productDetails };
