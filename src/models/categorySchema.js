import mongoose from "mongoose";
const { Schema } = mongoose

const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
    },
    isListed: {
        type: Boolean,
        default: true,
    },
    categoryOffer: {
        type: Number,
        defualt: 0,
    },
    // createdAt: {
    //     type: Date,
    //     defualt: Date.now
    // }
},{timestamps:true})

const Category = mongoose.model("Category", CategorySchema)

export default Category;