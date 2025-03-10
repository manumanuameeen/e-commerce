import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js";
import MESSAGES from "../../utils/adminConstants.js";

const categoryInfo = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit).populate({
                path: 'offers',
                select: "name,discount"
            });

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        return res.render("adminCategory", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });

    } catch (error) {
        console.error(error);
        return res.redirect("/pageerror");
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const normalizedName = name.trim().toLowerCase();
        const existingCategory = await Category.findOne({ normalizedName });
        if (existingCategory) {
            console.log("Category already exists");
            return res.status(statusCode.OK).json({ error: MESSAGES.CATEGORY_EXISTS });
        }

        const newCategory = new Category({
            name: name.toLowerCase(),
            description,
        });
        await newCategory.save();

        return res.json({
            success: true,
            message: MESSAGES.CATEGORY_ADDED,
            category: newCategory
        });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: MESSAGES.SERVER_ERROR
        });
    }
};

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        console.log("persectage from addcategory", percentage);

        const categoryId = req.body.categoryId;
        console.log("categoryId in add category", categoryId);

        const category = await Category.findById(categoryId);
        console.log(category);

        if (!category) {
            console.log("category not found");
            return res.status(statusCode.NOT_FOUND).json({ status: false, message: MESSAGES.CATEGORY_NOT_FOUND });
        }

        const products = await Product.find({ category: category._id });
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: MESSAGES.CATEGORY_OFFER_EXISTS });
        }
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        console.log(category);
        for (const product of products) {
            product.productOffer = percentage;
            product.salePrice = product.regularPrice - (product.regularPrice * percentage / 100);
            await product.save();
        }
        return res.json({ success: true });
    } catch (error) {
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ status: false, message: MESSAGES.SERVER_ERROR });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(statusCode.NOT_FOUND).json({
                status: false,
                message: MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                product.salePrice = product.regularPrice; 
                product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();

        return res.json({ status: true });

    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

const getListCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, {
            $set: {
                isListed: true
            }
        });
        console.log("category listed ");
        res.redirect('/admin/category');

    } catch (error) {
        res.redirect("/pageerror");
        console.log("something went wrong", error);
    }
};

const getunListCategory = async (req, res) => {
    try {
        const id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        console.log("category unlisted ");
        return res.redirect("/admin/category");
    } catch (error) {
        console.log("Error unlist catergory ", error);
        return res.redirect("/pageerror");
    }
};

const getEditcategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id });
        return res.render("edit-category", { category });
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const editCategory = async (req, res) => {
    console.log("now in editCategory");
    try {
        const categoryId = req.params.categoryId;
        const { categoryName, description } = req.body;

        const existingCategory = await Category.findOne({ name: categoryName });
        if (existingCategory) {
            return res.status(statusCode.OK).json({ error: MESSAGES.CATEGORY_EXISTS });
        }
        const updateCategory = await Category.findByIdAndUpdate(categoryId, {
            name: categoryName,
            description: description,
        }, { new: true });
        if (updateCategory) {
            res.redirect("/admin/Category");
        } else {
            res.status(statusCode.NOT_FOUND).json({ error: MESSAGES.CATEGORY_NOT_FOUND });
        }
    } catch (error) {
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.SERVER_ERROR });
    }
};

export {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getunListCategory,
    getEditcategory,
    editCategory,
};