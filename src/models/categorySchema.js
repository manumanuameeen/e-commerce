import mongoose from "mongoose";
const { Schema } = mongoose;

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
        default: 0, 
    },
    offers: [{
        type: Schema.Types.ObjectId,
        ref: "Offer", 
    }],
}, { timestamps: true });

const Category = mongoose.model("Category", CategorySchema);
export default Category;
