import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./db/index.js"
import path from "path"
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import userRouter from "./routes/userRouter.js"
connectDB()


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/admin"),path.join(__dirname,"views/users")]);
app.use(express.static(path.join(__dirname,"public")));
 

app.use('/',userRouter);

const PORT =3000||process.env.PORT;
app.listen(PORT,()=>{
    console.log(`server runing on ${PORT}`);



})  