import mongoose from "mongoose";
const {Schema} = mongoose;

const bannerSchema= new Schema({

image:{
    type:String,
    required:true
},
title:{
    type:String,
    required:true
},
description:{
    tyoe:String,
    required:true
},
link:{
    type:String,
},
startDate:{
    type:Date,
    required:true
},
endDate:{
    type:Date,
    required:true
}

},{timestamps:true})

const Banner = mongoose.model("Banner",bannerSchema)

export default Banner;