import Product from "../../models/productSchema.js";

import Category from "../../models/categorySchema.js";

// import Brand from "../../models/brandSchema.js";

import fs from "fs";

import path from "path"

import sharp from "sharp";

import { fileURLToPath } from 'url';
import { log } from "console";

// import { renderFile } from "ejs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




const getProductAddPage = async (req, res) => {
    try {

        const category = await Category.find({ isListed: true })
        res.render("product-add", {
            cat: category,
        });
    } catch (error) {
        res.redirect("/pageerror")
    }
};

const addProducts = async (req, res) => {
    console.log("now in add product");

    try {
        console.log("the value from front end ", req.body);

        const products = req.body;
        console.log("productsINfo:", products);

        // Check for duplicate product
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            return res.status(400).json({ success: false, message: "Product already exists" });
        }
        // Validation checks
        if (!products.productName || !products.category || !products.regularPrice) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }


        // Handle image uploads
        const images = [];
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'product-image');
            fs.mkdirSync(uploadDir, { recursive: true });

            for (const file of req.files) {
                try {
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const filePath = path.join(uploadDir, fileName);

                    await sharp(file.path)
                        .resize(440, 440, { fit: 'cover', position: 'center' })
                        .toFile(filePath);

                    images.push(fileName);

                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (error) {
                    console.error("Error processing image:", error);
                }
            }
        }

        // Get category
        const category = await Category.findOne({ name: products.category });
        if (!category) {
            return res.status(400).json({ success: false, message: "Invalid category" });
        }

        // Create and save new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            category: category._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdOn: new Date(),
            quantity: products.quantity,
            color: products.color,
            productImage: images,
            status: "Available"
        });
        console.log("product created :", newProduct);

        await newProduct.save();
        console.log('Product saved  successfully');

        // Window.location.reload();
        return res.status(200).json({ success: true, message: "Product added successfully" });
    } catch (error) {
        console.error("Error saving product:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const getAllProduct = async (req, res) => {
    try {
        console.log("coming from the products get methods")
        const search = req.query.search || " ";
        const page = req.query.page || 1;
        const limit = 2;


        const productData = await Product.find({

            productName: { $regex: new RegExp(".*" + search + ".*", "i") }

        })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();




        const count = await Product.find({

            productName: { $regex: new RegExp(".*" + search + ".*", "i") }

        })
            .countDocuments();



        const category = await Category.find({ isListed: true })

        // console.log("this is the Product data:", productData, " and this one is coategories:", category);

        if (category) {


            res.render('adminProduct', {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
            })
            // console.log("renderend successfully");

        } else {
            res.redirect('/pageerror')
            console.log("Error in get prpoduct");

        }
    } catch (error) {

    }
}

const blockProduct = async (req,res) => {
    console.log("now in BlockProduct");
    try {
        console.log(req.query.id);
        const id = req.query.id;
        
        const blockProduct = await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        if (!blockProduct) {
            return res.status(404).json({ success: false, message: "product not found" })
        }
        res.redirect("/admin/products");

    } catch (error) {
        res.redirect("/pageerror");
    }
}

const unBlockProduct = async (req, res) => {
    console.log("now in unBlockProduct");
    
    try {
        const id = req.query.id;
        const unBlockProduct = await Product.updateOne({ _id: id }, { isBlocked: false })
        if (!unBlockProduct) {
            res.status(404).json({ success: false, message: "unblock product failed" })
        }
console.log("product Blocked succefully");

        res.redirect("/admin/products")

    } catch (error) {
        res.redirect("/pageerror")
        console.log("Error in Unblock procduct",error);
        

    }
}

export {
    getProductAddPage,
    addProducts,
    getAllProduct,
    blockProduct,
    unBlockProduct

}









