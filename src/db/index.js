import env from "dotenv"
import mongoose from "mongoose";

env.config();

const connectDB = async () => {
    try {
       await mongoose.connect((process.env.MONGODB_URI)) 
        console.log("DB connected");

    } catch (error) {
     console.log("db connection erro",error.message);
     process.exit(1)
    
    }
}

  export {connectDB}
 