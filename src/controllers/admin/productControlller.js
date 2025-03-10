import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js"




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getProductAddPage = async (req, res) => {
 
    try {

        // if (!req.session.admin) {
        //     return res.redirect("/admin/login");
        // }

        const category = await Category.find({ isListed: true }).lean();
        res.render("product-add", { cat: category });
    } catch (error) {
        console.error("Error in getProductAddPage:", error);
        res.redirect("/pageerror");
    }
};



const addProducts = async (req, res) => {
    try {
        const products = req.body;
console.log(req.body)
        if (!products.productName || !products.category || !products.regularPrice) {
            console.log('here1');

            return res.status(statusCode.OK
).json({ success: false, message: "Missing required fields" });
        }

        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            console.log('here2');
            
            return res.status(statusCode.OK
).json({ success: false, message: "Product already exists" });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, "../../public/uploads/re-image");
            fs.mkdirSync(uploadDir, { recursive: true });

            for (const file of req.files) {
                try {
                    console.log('here3');

                    const fileName = `${Date.now()}-${file.originalname}`;
                    const filePath = path.join(uploadDir, fileName);
                    
                    await sharp(file.path)
                        .resize(440, 440, { fit: 'cover', position: 'center' })
                        .toFile(filePath);

                    images.push(fileName);
                    
                } catch (error) {
                    console.log('here4');

                    console.error("Error processing image:", error);
                }
            }
        }

     
        let colorVarients = [];
        const colors = Array.isArray(products.colors) ? products.colors : [products.colors];
        const quantities = Array.isArray(products.quantities) ? products.quantities : [products.quantities];

        for (let i = 0; i < colors.length; i++) {
            if (colors[i] && quantities[i]) {
                colorVarients.push({
                    color: colors[i],
                    quantity: parseInt(quantities[i])
                });
            }
        }

        const category = await Category.findOne({ _id: products.category });
        if (!category) {
            console.log('here5');
            return res.status(statusCode.OK
).json({ success: false, message: "Invalid category" });
        }

        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            category: category._id,
            regularPrice: parseFloat(products.regularPrice),
            salePrice: parseFloat(products.salePrice),
            colorVarients: colorVarients,
            productImage: images,
            status: "Available",
            brand:products.brand
        });

        await newProduct.save();
        return res.status(statusCode.OK).json({ success: true, message: "Product added successfully" });
    } catch (error) {
        console.log('here6');
        console.error("Error saving product:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR
).json({ success: false, message: "Internal server error" });
    }
};
const getAllProduct = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const productData = await Product.find({
            productName: { $regex: new RegExp(".*" + search + ".*", "i") }
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('category')
        .lean();

        const count = await Product.countDocuments({
            productName: { $regex: new RegExp(".*" + search + ".*", "i") }
        });

        const category = await Category.find({ isListed: true }).lean();
console.log("product data from product page",productData);

        res.render('adminProduct', {
            data: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            cat: category,
        });
    } catch (error) {
        console.error("Error in getAllProduct:", error);
        res.redirect("/pageerror");
    }
};

const blockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const blockProduct = await Product.updateOne({ _id: id }, { isBlocked: true });

        if (!blockProduct) {
            return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Product not found" });
        }

        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error blocking product:", error);
        res.redirect("/pageerror");
    }
};

const unBlockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const unBlockProduct = await Product.updateOne({ _id: id }, { isBlocked: false });

        if (!unBlockProduct) {
            return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Product not found" });
        }

        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error unblocking product:", error);
        res.redirect("/pageerror");
    }
};

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findById(id).lean();
        const categories = await Category.find({ isListed: true }).lean();
const productCat = await Category.find({_id:product.category})
        res.render("edit-product", { product, cat: categories,productCat  });
    } catch (error) {
        console.error("Error in getEditProduct:", error);
        res.redirect("/pageerror");
    }
};

const editProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: productId }
        });

        if (existingProduct) {
            return res.status(statusCode.OK
).json({ error: "Product with this name already exists" });
        }

        const product = await Product.findById(productId);
        const images = req.files?.map(file => file.filename) || [];

        const category = await Category.findOne({ name: data.category });
        if (!category) {
            return res.status(statusCode.OK
).json({ error: "Category not found" });
        }
        const colorVarients = [];
        const colors = Array.isArray(data.colors) ? data.colors : [data.colors];
        const quantities = Array.isArray(data.quantities) ? data.quantities : [data.quantities];
        
        for (let i = 0; i < colors.length; i++) {
            if (colors[i] && quantities[i]) {
                colorVarients.push({
                    color: colors[i],
                    quantity: parseInt(quantities[i])
                });
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            colorVarients: colorVarients, 
        };

        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(productId, updateFields, { new: true });
        res.redirect(`/admin/edit-Product?id=${id}`);
    } catch (error) {
        console.error("Error in editProduct:", error);
        res.redirect("/pageerror");
    }
};

 
const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } });

        const imagePath = path.join(__dirname, "../../public/uploads/re-image", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        }

        res.send({ status: true });
    } catch (error) {
        console.error("Error in deleteSingleImage:", error);
        res.redirect('/pageerror');
    }
};

export {
    getProductAddPage,
    addProducts,
    getAllProduct,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
};
