import Product from "../../models/productSchema.js";

import Category from "../../models/categorySchema.js";

import User from "../../models/userSchema.js"






const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;

        
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
      console.log("finding category",findCategory)
      const findRelatedProduct =await Product.find({category:findCategory})
      console.log("product name",findRelatedProduct.length)
        const categoryOffer = findCategory ? findCategory.offer || 0 : 0;  
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;
        
        res.render("product-details", {
          user:userData,
          product:product,
          quantity:product.quantity,
          totalOffer:totalOffer,
          categories:findCategory,
          findRelatedProduct,
          

        });
        
    } catch (error) {
        console.log("Error in product details:", error);
        res.redirect("/pageNotFound");
    }
};






export {
    productDetails,

}