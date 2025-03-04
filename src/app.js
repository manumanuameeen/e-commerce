import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import session from "express-session";
import nocache from "nocache";
import passport from "./config/passport.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import flash from "connect-flash";
import errorHandler from "./middlewares/erroHandling.js";
process.removeAllListeners("warning");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();


app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 72 * 60 * 60 * 1000
        }
    })
);



app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(nocache());

app.set("view engine", "ejs");
app.set("views", [
  
    path.join(__dirname, "views/users")
]);

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.xhr || req.headers.accept.includes("application/json")) {
        res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    } else {
        next(err);
    }
});                     


app.use(errorHandler);
app.use("/", userRouter);
app.use("/admin", adminRouter);

connectDB()
    .then(() => {
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch(err => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
