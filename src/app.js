import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./db/index.js"
import path from "path"
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from "express-session";
import { nextTick } from "process";
import nocache from "nocache";
import passport from "./config/passport.js";
import userRouter from "./routes/userRouter.js"
import adminRouter from "./routes/adminRouter.js"


connectDB()


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.session())

app.use(nocache());

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/admin"),path.join(__dirname,"views/users")]);
app.use(express.static(path.join(__dirname,"public")));
 

app.use('/',userRouter);
app.use('/admin', adminRouter);
// const PORT ="3000"||process.env.PORT;
const port = process.env.PORT || 3000;


app.listen(port,()=>{
    console.log(`server runing on ${port}`);
})  