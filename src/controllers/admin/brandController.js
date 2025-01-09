import { render } from "ejs"
import Brand from "../../models/brandSchema.js"
import Product from "../../models/productSchema.js"





const getBrandPage = async (req, res) => {
    try {


        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page - 1) * limit;
        const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit({ limit })
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);
        const reverseBrand = brandData.reverse();
        return res.render("brand", {
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,


        })

    } catch (error) {
        res.redirect("/pageerror")
    }
}


const addBrand =async (req,res) => {
    
 try {
    const brand = req.body.name;
    if (!brand ) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const findBrand = await Brand.findOne({brandName:brand});
    if(!findBrand){
        // console.log(__dirname(req.file.filename));
        
        const image = req.file.filename;
        const newBrand = new Brand({
            brandName:brand,
            brandImage:image
        })
        await newBrand.save();
        
        
        return res.redirect("/admin/brand")

    }

 } catch (error) {
    console.log("an error occured  in add bran",error);
    
    res.status(500).json({ message: "Something went wrong", error: error.message });

 }
}







export {
    getBrandPage,
    addBrand,
}