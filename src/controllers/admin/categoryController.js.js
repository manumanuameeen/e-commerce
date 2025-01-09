import { query } from "express";
import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js"

const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req, query.page) || 1
        const limit = 4;
        const skip = (page - 1) * limit

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        return res.render("adminCategory", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })



    } catch (error) {

        console.error(error)
        return res.redirect("/pageerror")
    }
}


const addCategory = async (req, res) => {

    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name })
        if (existingCategory) {
            console.log("category already exists");
            return res.status(400).json({ error: "Category already exist" })

        }
        const newCategory = new Category({
            name,
            description,
        })

        await newCategory.save();
        return res.json({ success: true, message: "Category added successflly", category: newCategory })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" })


    }

}




const addCategoryOffer = async (req, res) => {
    try {

        const percentage = parseInt(req.body.percentage);
        console.log("persectage from addcategory", percentage);

        const categoryId = req.body.categoryId;
        console.log("categoryId in add category", categoryId);

        const category = await Category.findById(categoryId)
console.log(category);

        if (!category) {
            console.log("category not found");
            
            return res.status(404).json({ status: false, message: "category not found " });
        }

        const products = await Product.find({ category: category._id });
        console.log("products doucment is there: ",products)
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: "Product within this category already have product offer" })
        }
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })

        console.log(category);
        for (const product of products) {
            product.productOffer = percentage
            product.salePrice = product.regularPrice - (product.regularPrice * percentage / 100);;

            await product.save();
            console.log("products doucment is there: ",products)
        }
        return res.json({ success: true })
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" })
    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                status: false,
                message: 'Category not found'
            });
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                
                product.salePrice = product.regularPrice;                 product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();
        
        return res.json({ status: true }); 

    } catch (error) {
    
        console.error("Error in removeCategoryOffer:", error);
        return res.status(500).json({
            status: false,
            message: 'Internal server error'
        });
    }
};



const getListCategory= async (req,res) => {
    
try {
    let id = req.query.id;
    // console.log("listed:category Id:",id);
    
    await Category.updateOne({_id:id},{$set:{
        isListed:true
    }});
    console.log("category listed ");

    res.redirect('/admin/category')
    
} catch (error) {
    res.redirect("/pageerror")
   console.log("something went wrong",error);
   
}

}


const getunListCategory =async (req,res) => {
    
  try {
    const id = req.query.id
    // console.log("UNLIST: category id:",id,);
    await Category.updateOne({_id:id},{$set:{isListed:false}})
console.log("category unlisted ");
return res.redirect("/admin/category")
  } catch (error) {
      console.log("Error unlist catergory ",error);
    return res.redirect("/pageerror")
    
  }
}


const getEditcategory = async (req,res) => {
    try {
        const id =req.query.id;
        const category = await Category.findOne({_id:id});

        return res.render("edit-category",{category})
    } catch (error) {
        res.redirect("/pageerror")
    }


}


const editCategory = async (req,res) => {
    console.log("now in editCategory");
    
    try {
        
        const  id = req.params.id;
        console.log("id:",id);
        
        const {categoryName,description} =req.body;

        const existingCategory = await Category.findOne({name:categoryName});
        console.log("exsits:",existingCategory);
        
        if(existingCategory){
            return res.status(400).json({error:"Category exist please choose another name"})
        }
const  updateCategory = await Category.findByIdAndUpdate(id,{
    name:categoryName,
    description:description,

},{new:true});
if(updateCategory){
    res.redirect("/admin/Category");
}else{
    res.status(404).json({error:"category not found"})
}


    } catch (error) {
        res.status(500).json({error:"INternal server error"})
    }
}


export {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getunListCategory,
    getEditcategory,
    editCategory,

}