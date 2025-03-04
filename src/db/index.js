import env from "dotenv"
import mongoose from "mongoose";

env.config();

const connectDB = async () => {
    try {
        const conn =  await mongoose.connect((process.env.MONGODB_URI)) 
        console.log(conn.connection.name)

    } catch (error) {
     console.log("db connection erro",error.message);
     process.exit(1)
    
    }
}

  export {connectDB}
 