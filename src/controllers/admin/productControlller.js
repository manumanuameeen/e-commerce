import Product from "../../models/productSchema.js";

import Category from "../../models/categorySchema.js";


import fs from "fs";

import path from "path"

import sharp from "sharp";

import { fileURLToPath } from 'url';
import { log } from "console";



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
    // console.log("now in add product");

    try {
        // console.log("the value from front end ", req.body);

        const products = req.body;
        // console.log("productsINfo:", products);

        // Check for duplicate product
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            return res.status(400).json({ success: false, message: "Product already exists" });
        }
     
        if (!products.productName || !products.category || !products.regularPrice) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }


        const images = [];
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, "../../public/uploads/re-image");
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
        const search = req.query.search || "";
        const page = req.query.page || 1;
       
        console.log("Search query is getting:", search);
        const limit = 4; 

        const productData = await Product.find({
            productName: { $regex: new RegExp(".*" + search + ".*", "i") }
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('category')
        .exec();
// console.log("prosucts from get all aproidect",productData);


        const count = await Product.find({

            productName: { $regex: new RegExp(".*" + search + ".*", "i") }

        }).countDocuments();

            


        const category = await Category.find({ isListed: true })
console.log("category wht",category);

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

const blockProduct = async (req, res) => {
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
        console.log("Error in Unblock procduct", error);


    }
}


const getEditProduct = async (req, res) => {

    try {
        const id = req.query.id
        console.log("id",id)
        const product = await Product.findOne({ _id: id })

        console.log("from the product id in the load get method",product)
        const categories = await Category.find({isListed:true})
         return res.render("edit-product", {
            product: product,
            cat: categories,
        })


    } catch (error) {
        res.redirect("/pageerror")
    }
}


const editProduct = async (req, res) => {
    console.log("is getting here in edit ");

    try {
        const id = req.params.id;
        console.log("id gettin ghere",id);
        
        
         const data = req.body;
         console.log("data getting here",data);
         
         const existingProduct =await Product.findOne({
             productName: data.productName,
             _id: { $ne: id }
         })  
console.log("existingProduct ",existingProduct);

        if (existingProduct) {
            return res.status(400).json({ error: "Product with name already exists. Please try with another name" });
        }

       
        const product = await Product.findOne({ _id: id });


        console.log("gettinf after  product  finding");

       
        const images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imagePath = `${file.filename}`;
                images.push(imagePath);
            }
        }

        const category = await Category.findOne({name:data.category})

        if(!category){
            return res.status(400).json({error:"Category not found"})
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color,
        };

        console.log(updateFields)
console.log("also gettinf after the update field");

        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        

        // Update the product
        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        console.log("also gettinf after the product update field");

        console.log("The product is updating");
        
        // Redirect to the product list after successful update
        res.redirect(`/admin/edit-Product?id=${id}`);
    } catch (error) {
        console.log("Error in edit Product ", error);
        console.log(error.message)
        return res.redirect("/pageerror");
    }
};



const deleteSingleImage = async (req, res) => {

    try {
        const { imageNameToServer, productIdToServer } = req.body;

        const product = await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } })

        const imagePath = path.join("public", "uploads", "re-image", "imageNameToServer")
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);

        } else {
            console.log(`image ${imageNameToServer} not found`);
            res.send({ status: true });


        }


    } catch (error) {

        res.redirect('/pageerror')
        console.log("error in delete image", error);

    }

}

export {
    getProductAddPage,
    addProducts,
    getAllProduct,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,

}









