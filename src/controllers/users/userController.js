// import { name, render } from "ejs";
import User from "../../models/userSchema.js"
import nodemailer from "nodemailer"
import env from "dotenv"
import bcrypt from "bcrypt"
import Category from "../../models/categorySchema.js"
import Product from "../../models/productSchema.js"




const loadpageNotFound = async (req, res) => {

    try {
        return res.render('pageNotFound')

    } catch (error) {

        return res.redirect("/pageNotFound")

    }
}


const loadsignup = async (req, res) => {
    console.log("now in signup page");

    try {
        return res.render('signup')
    } catch (error) {
        console.log("sign up page not found")
        res.status(500).send("service error")
    }
}


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVerificationEmail(email, otp) {

    console.log("the otp verification goining on");

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your otp is: ${otp}`,
            html: `<b>Your otp: ${otp}</b>`,
        });

        return info.accepted && info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}


const signup = async (req, res) => {
    console.log("working on the sign up page");

    try {
        const { name, email, phone, password, cPassword } = req.body


        if (password !== cPassword) {
            return res.render('signup', { message: "Password do not match" })
        }


        const findUser = await User.findOne({ email });
        // console.log("find User", findUser);

        if (findUser) {
            return res.render("signup", { message: "User already exists" })
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp)

        if (!emailSent) {
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.userData = { email, password, phone, name };
        // req.session.user = req.session.userData
      

        res.render("verify-otp")

        console.log("OTP sent:", otp);


    } catch (error) {
        console.error("SIGN UP error", error)
        res.redirect('/pageNotFound')
    }
}


async function securePassword(password) {
    console.log("the password is securing (hashing)");

    try {
        const saltRound = 10
        const passwordHash = await bcrypt.hash(password, saltRound)
        // console.log("hashed password      :", passwordHash)
        return passwordHash;


    } catch (error) {
        console.log(" Error hashing password", error)
        return null;
    }

}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;


        if (otp == req.session.userOtp) {

            const user = req.session.userData;
            console.log("adnkjasnk");

            const passwordHash = await securePassword(user.password);

            const newUser = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            console.log(newUser);

            await newUser.save();

            req.session.user = newUser._id;

            return res.json({
                success: true,
                redirectUrl: "/login",
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again.",
        });
    }
};


async function resendVerificationEmail(email, otp) {

    console.log("the otp verification goining on");

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your otp is: ${otp}`,
            html: `<b>Your otp: ${otp}</b>`,
        });

        return info.accepted && info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}


const resendotp = async (req, res) => {
    console.log("Resend otp is working, sending the request");

    try {
        const { email } = req.session.userData;
        console.log("eamil is here in resednotp ", email)
        if (!email) {
            return res.status(500).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();

        console.log("resend otp created:", otp);

        req.session.userOtp = otp;

        const emailSent = await resendVerificationEmail(email, otp);
        console.log("the email sented successfully", emailSent)
        if (emailSent) {
            console.log("Resend otp :", otp);
            res.status(200).json({ success: true, message: "OTP Resent successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.log("Error sending OTP", error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again." });
    }
};

const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        
       
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .populate('category')
        .sort({ createdOn: -1 })
        .limit(4)
        .lean();

        const viewData = {
            products: productData,
            categories: categories,
            user:null,
            
        };

        if (req.session.user) {
            const userData = await User.findOne({ _id: user._id }).lean();
            viewData.user = userData;
        }

        res.render("home", viewData);
    } catch (error) {
        console.log("Error in homepage:", error);
        res.status(500).send("Service error");
    }
};

const loadlogin = async (req, res) => {
    console.log("now login");
    try {
        if (!req.session.user) {
            console.log("there is no user here");
            return res.render("login");
        } else {
            return res.redirect("/");
        }
    } catch (error) {
        console.log("login page error", error);
        res.redirect("/pageNotFound");
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

if(!email||password){
    res.render('login',{message:"Email and password are required"})
}
        const findUser = await User.findOne({ isAdmin: false, email: email });


        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }

        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by Admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("login", { message: "Password doesn't match. Please try again" });
        }


        req.session.user = findUser;

        res.redirect("/");

    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed. Try again" });
    }
};


const loadlogout = async (req, res) => {

    try {

        req.session.destroy((err) => {
            if (err) {
                console.log("session destrution error", err);
                return res.redirect("/pageNotFound")
            }

            res.redirect("/login")
        })


    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound")
    }
}

const loadShopingPage = async (req, res) => {
    try {

        const user = req.session.user
        console.log("is user is there", user)
        
        const userData = await User.findOne({ _id: user})




        const categories = await Category.find({ isListed: true })

        const categoryIds = categories.map((category) => category._id);

        const page = parseInt(req.query.page) || 1;

        const limit = 9

        const skip = (page - 1) * limit;

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
        }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        console.log("products", products)
        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
        })
        // console.log("totalProdcut is getting here",totalProducts)

        const totalPages = Math.ceil(totalProducts / limit);

        res.render("shop", {
            user: userData,
            products: products,
            categories: categories,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
        })
        console.log(categoryIds);

    } catch (error) {
        console.log(error);

        res.redirect('/pageNotFound')

    }


}


const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const findCategory = category ? await Category.findOne({ _id: category }) : null;

        const query = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        if (findCategory) {
            query.category = findCategory._id;
        }

        let findProducts = await Product.find(query).lean();
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const categories = await Category.find({ isListed: true });

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    searchedOn: new Date()
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProduct;
        res.render('shop', {
            user: userData,
            products: currentProduct,
            categories: categories,
            totalPages: totalPages,
            currentPage: currentPage,
            selectedCategory: findCategory || null,
        });

    } catch (error) {
        console.log("error in filtering:", error);
        res.redirect('/pageNotFound');
    }
};

const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        let userData = await User.findOne({ _id: user })

        const categories = await Category.find({ isListed: true }).lean();


        let findProducts = await Product.find({
            salePrice: { $gt: req.query.gt, $lt: req.query.lt },
            isBlocked: false,
            quantity: { $gt: 0 },


        }).lean()



        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));


        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);


        req.session.filteredProducts = currentProduct;
        res.render('shop', {
            user: userData,
            products: currentProduct,
            categories: categories,
            totalPages: totalPages,
            currentPage: currentPage,

        });

    } catch (error) {
        console.log("Error in price filtering:", error);
        res.redirect('/pageNotFound');
    }
};
const searchProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        let search = req.body.search || '';
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());

        let searchResult = [];
        if (req.session.filterProduct && req.session.filterProduct.length > 0) {
            searchResult = req.session.filterProduct.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            searchResult = await Product.find({
                productName: { $regex: new RegExp(search, 'i') },
                isBlocked: false,
                quantity: { $gt: 0 },
                category: { $in: categoryIds }
            }).lean();
        }

        searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);

        res.render("shop", {
            user: userData,
            products: currentProduct,
            categories: categories,
            totalPages: totalPages,
            currentPage: currentPage,
            count: searchResult.length,
            searchQuery: search
        });
    } catch (error) {
        console.log("error in search:", error);
        res.redirect("/pageNotFound");
    }
};




export {
    loadHomepage,
    loadpageNotFound,
    loadsignup,
    loadlogin,
    signup,
    verifyOtp,
    resendotp,
    login,
    loadlogout,
    loadShopingPage,
    filterProduct,
    filterByPrice,
    searchProduct,

}