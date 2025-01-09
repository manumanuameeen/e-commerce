// import { name, render } from "ejs";
import User from "../../models/userSchema.js"
import nodemailer from "nodemailer"
import env from "dotenv"
import bcrypt from "bcrypt"






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
        // console.log("req.session.userOtp", req.session.userOtp)
        // console.log("req.session.userData", req.session.userData);

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
    console.log("home page renderd")
    try {
        const user = req.session.user
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            return res.render("home", { user: userData })
        } else {
            return res.render("home")
        }

    } catch (error) {
        console.log("home page not found", error);
        res.status(500).send("service error");
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
    // console.log("login verification going on");
    try {
        const { email, password } = req.body;

        // console.log("data from the user that entered in the login page", email, password);

        const findUser = await User.findOne({ isAdmin: false, email: email });

        // console.log("user from database", findUser);

        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }

        if (findUser.isblocked) {
            return res.render("login", { message: "User is blocked by Admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        // console.log("the password is matching:", passwordMatch);

        if (!passwordMatch) {
            return res.render("login", { message: "Password doesn't match. Please try again" });
        }


        req.session.user = findUser;
        // console.log("User data stored in the session successfully");
        // console.log("Database user ID", req.session.user._id);

        res.redirect("/");

    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed. Try again" });
    }
};


const loadlogout =async (req,res) => {
    
    try {
       
req.session.destroy((err)=>{
    if(err){
        console.log("session destrution error",err);
        return res.redirect("/pageNotFound")
    }

    res.redirect("/login")
})


    } catch (error) {
        console.log("Logout error",error);
        res.redirect("/pageNotFound")
    }
}

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

}