// import { name, render } from "ejs";
import User from "../../models/userSchema.js"
import nodemailer from "nodemailer"
import env from "dotenv"
import bcrypt from "bcrypt"
import Category from "../../models/categorySchema.js"
import Product from "../../models/productSchema.js"
import Wallet from "../../models/wallet.js"
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js"


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
        if (!req.session.user) {
            console.log("there is no user here");
            const referralCode = req.query.ref || '';
            return res.render('signup', { referralCode });
        }
        return res.redirect('/');
    } catch (error) {
        console.log("sign up page not found");
        res.status(statusCode.INTERNAL_SERVER_ERROR).send("service error");
    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


function generateReferralCode(name) {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${randomNum}`;
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
        const { name, email, phone, password, cPassword, referralCode } = req.body;

        if (password !== cPassword) {
            return res.render('signup', { message: "Password do not match" });
        }

        const findUser = await User.findOne({ email });

        if (findUser) {
            if (findUser.isBlocked) {
                return res.render("signup", { message: "User is blocked by admin" });
            }
            return res.render("signup", { message: "User already exists" });
        }


        let referrer = null;
        if (referralCode) {
            referrer = await User.findOne({ referalCode: referralCode });
            if (!referrer) {
                return res.render("signup", { message: "Invalid referral code" });
            }
            if (referrer.isBlocked) {
                return res.render("signup", { message: "This referral code is no longer valid" });
            }
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error");
        }

        const newUserReferralCode = generateReferralCode(name);
        const uniqueAvatar = `https://avatars.dicebear.com/api/bottts/${encodeURIComponent(email)}.svg`;

        req.session.userOtp = otp;
        req.session.userData = {
            email,
            password,
            phone,
            name,
            referralCode,
            newUserReferralCode,
            referrerId: referrer ? referrer._id : null,
            avatar: uniqueAvatar,
        };

        res.render("verify-otp");
        console.log("OTP sent:", otp);

    } catch (error) {
        console.error("SIGN UP error", error);
        res.redirect('/pageNotFound');
    }
}

async function securePassword(password) {
    console.log("the password is securing (hashing)");
    try {
        const saltRound = 10;
        const passwordHash = await bcrypt.hash(password, saltRound);
        return passwordHash;
    } catch (error) {
        console.log(" Error hashing password", error);
        return null;
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp == req.session.userOtp) {
            const userData = req.session.userData;
            const passwordHash = await securePassword(userData.password);


            const newUser = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
                referalCode: userData.newUserReferralCode,
                redeemed: false
            });

            await newUser.save();


            const newUserWallet = new Wallet({
                userId: newUser._id,
                balance: 0,
                transactions: [],
                creditHistory: [],
                debitHistory: []
            });


            if (userData.referrerId) {
                const referrer = await User.findById(userData.referrerId);


                let referrerWallet = await Wallet.findOne({ userId: referrer._id });

                if (!referrerWallet) {
                    referrerWallet = new Wallet({
                        userId: referrer._id,
                        balance: 0,
                        transactions: [],
                        creditHistory: [],
                        debitHistory: []
                    });
                }


                referrerWallet.balance += 3000;
                referrerWallet.transactions.push({
                    type: "credit",
                    amount: 3000,
                    description: `Referral bonus for referring ${newUser.email}`
                });
                referrerWallet.creditHistory.push({
                    amount: 3000,
                    description: `Referral bonus for referring ${newUser.email}`
                });
                await referrerWallet.save();


                referrer.wallet = referrerWallet._id;
                referrer.redeemedUsers = newUser._id;
                await referrer.save();

                newUserWallet.balance += 1000;
                newUserWallet.transactions.push({
                    type: "credit",
                    amount: 1000,
                    description: `Signup bonus for using referral code ${userData.referralCode}`
                });
                newUserWallet.creditHistory.push({
                    amount: 1000,
                    description: `Signup bonus for using referral code ${userData.referralCode}`
                });
            }

            await newUserWallet.save();

            newUser.wallet = newUserWallet._id;
            newUser.redeemed = !!userData.referrerId;
            await newUser.save();

            return res.json({
                success: true,
                redirectUrl: "/",
            });
        } else {
            return res.status(200
            ).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
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
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();

        console.log("resend otp created:", otp);

        req.session.userOtp = otp;

        const emailSent = await resendVerificationEmail(email, otp);
        console.log("the email sented successfully", emailSent)
        if (emailSent) {
            console.log("Resend otp :", otp);
            res.status(statusCode.OK).json({ success: true, message: "OTP Resent successfully" });
        } else {
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.log("Error sending OTP", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error. Please try again." });
    }
};

const loadHomepage = async (req, res) => {
//    console.log(statusCode.OK);
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id);
        const fProducts = await Product.find({ isBlocked: false }).sort({ createdAt: -1 }).limit(4)
        const productsB = await Product.find({
            isBlocked: false,
            productImage: { $exists: true, $ne: [] }
        })
            .limit(10)
            .select('name productImage')
            .lean();

        // console.log('Products with images:', JSON.stringify(productsB, null, 2));

        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds }
        })
            .populate('category')
            .sort({ createdOn: -1 })
            .limit(4)
            .lean();

        const viewData = {
            products: productData,
            categories: categories,
            user: user ? user : null,
            fProducts,
            productsB: productsB
        };

        res.render("home", viewData);
    } catch (error) {
        console.log("Error in homepage:", error.message);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send("Service error");
    }
};

const loadlogin = async (req, res) => {
    console.log("now login");
    try {
        if (!req.session.user) {
            console.log('login:', "there is no user here");
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


        req.session.user = findUser._id;

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


// const loadShopingPage = async (req, res) => {
//     try {
//         const user = req.session.user;
//         const userData = await User.findOne({ _id: user });
//         const categories = await Category.find({ isListed: true });

//         const categoryId = req.query.category;
//         const searchQuery = req.query.search;
//         const priceRange = req.query.price;
//         const availability = req.query.availability;
//         const sort = req.query.sort || 'newest';
//         const page = parseInt(req.query.page) || 1;
//         const limit = 9;

//         let query = {
//             isBlocked: false,
//             'colorVarients': { $elemMatch: { quantity: { $gt: 0 } } }
//         };

//         if (categoryId) {
//             query.category = categoryId;
//         }

//         if (searchQuery) {
//             query.$or = [
//                 { productName: { $regex: searchQuery, $options: 'i' } }
//             ];
//         }

//         if (priceRange) {
//             const priceRanges = {
//                 'below-1500': { $lt: 30000 },
//                 '1500-2000': { $gte: 30000, $lte: 50000 },
//                 '2000-2500': { $gte: 50000, $lte: 70000 },
//                 '2500-3000': { $gte: 70000, $lte: 90000 },
//                 '3000-4000': { $gte: 90000, $lte: 110000 },
//                 'Above4000': { $gt: 110000 }
//             };
//             if (priceRanges[priceRange]) {
//                 query.salePrice = priceRanges[priceRange];
//             }
//         }

//         if (availability === 'Available') {
//             query['colorVarients.quantity'] = { $gt: 0 };
//         } else if (availability === 'Unavailable') {
//             query['colorVarients.quantity'] = { $lte: 0 };
//         }

//         const sortOptions = {
//             'newest': { createdAt: -1 },
//             'price-asc': { salePrice: 1 },
//             'price-desc': { salePrice: -1 },
//             'name-asc': { productName: 1 },
//             'name-desc': { productName: -1 }
//         };

//         const skip = (page - 1) * limit;

//         const totalProducts = await Product.countDocuments(query);
//         const products = await Product.find(query)
//             .sort(sortOptions[sort] || sortOptions.newest)
//             .skip(skip)
//             .limit(limit)
//             .populate('category')
//             .lean();



//         const totalPages = Math.ceil(totalProducts / limit);

//         const isAjaxRequest = req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest');

//         if (isAjaxRequest) {
//             return res.render('shop', {
//                 user: userData,
//                 products: products,
//                 categories: categories,
//                 currentPage: page,
//                 totalPages: totalPages,
//                 totalProducts: totalProducts,
//                 currentSort: sort,
//                 price: priceRange,
//                 searchQuery: searchQuery,
//                 availability: availability,
//                 sort: req.query.sort || null,
//                 query: req.query,
//                 queryParams: req.query,
//                 layout: false   });
//         }

//         res.render('shop', {
//             user: userData,
//             products: products,
//             categories: categories,
//             currentPage: page,
//             totalPages: totalPages,
//             totalProducts: totalProducts,
//             currentSort: sort,
//             price: priceRange,
//             searchQuery: searchQuery,
//             availability: availability,
//             sort: req.query.sort || null,
//             query: req.query,
//             queryParams: req.query,
//         });
//     } catch (error) {
//         console.error('Error in shop page:', error);
//         res.redirect('/pageNotFound');
//     }
// };

const loadShopingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });

        const categoryId = req.query.category;
        const searchQuery = req.query.search;
        const priceRange = req.query.price;
        const availability = req.query.availability;
        const sort = req.query.sort || 'newest';
        const page = parseInt(req.query.page) || 1;
        const limit = 9;

        let query = {
            isBlocked: false,
            'colorVarients': { $elemMatch: { quantity: { $gt: 0 } } },
        };

        if (categoryId) {
            query.category = categoryId;
        }

        if (searchQuery) {
            query.$or = [{ productName: { $regex: searchQuery, $options: 'i' } }];
        }

        if (priceRange) {
            const priceRanges = {
                'below-1500': { $lt: 30000 },
                '1500-2000': { $gte: 30000, $lte: 50000 },
                '2000-2500': { $gte: 50000, $lte: 70000 },
                '2500-3000': { $gte: 70000, $lte: 90000 },
                '3000-4000': { $gte: 90000, $lte: 110000 },
                'Above4000': { $gt: 110000 },
            };
            if (priceRanges[priceRange]) {
                query.salePrice = priceRanges[priceRange];
            }
        }

        if (availability === 'Available') {
            query['colorVarients.quantity'] = { $gt: 0 };
        } else if (availability === 'Unavailable') {
            query['colorVarients.quantity'] = { $lte: 0 };
        }

        const sortOptions = {
            'newest': { createdAt: -1 },
            'price-asc': { salePrice: 1 },
            'price-desc': { salePrice: -1 },
            'name-asc': { productName: 1 },
            'name-desc': { productName: -1 },
        };

        const skip = (page - 1) * limit;


        const listedCategories = await Category.find({ isListed: true }).select('_id');
        const listedCategoryIds = listedCategories.map(category => category._id);

        query.category = { $in: listedCategoryIds };
        const totalProducts = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip(skip)
            .limit(limit)
            .populate('category')
            .lean();

        const totalPages = Math.ceil(totalProducts / limit);
        const isAjaxRequest = req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest');

        if (isAjaxRequest) {
            return res.render('shop', {
                user: userData,
                products: products,
                categories: categories,
                currentPage: page,
                totalPages: totalPages,
                totalProducts: totalProducts,
                currentSort: sort,
                price: priceRange,
                searchQuery: searchQuery,
                availability: availability,
                sort: req.query.sort || null,
                query: req.query,
                queryParams: req.query,
                layout: false,
            });
        }

        res.render('shop', {
            user: userData,
            products: products,
            categories: categories,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            currentSort: sort,
            price: priceRange,
            searchQuery: searchQuery,
            availability: availability,
            sort: req.query.sort || null,
            query: req.query,
            queryParams: req.query,
        });
    } catch (error) {
        console.error('Error in shop page:', error);
        res.redirect('/pageNotFound');
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


}