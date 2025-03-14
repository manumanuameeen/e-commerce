import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Address from "../../models/addressSchema.js";
import Order from "../../models/orderSchema.js";
import { statusCode, isValidStatusCode } from "../../utils/statusCodes.js";
import MESSAGES from "../../utils/userConstant.js";

import nodemailer from "nodemailer";
import env from "dotenv";
import bcrypt from "bcrypt";
import Wallet from "../../models/wallet.js";

function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
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
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP:${otp}</h4><br></b>`,
        };
        const info = await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("error sending email", error);
        return false;
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password", error);
    }
};

const getForgotPassPage = async (req, res) => {
    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!email || !emailPattern.test(email)) {
            return res.render("forgot-password", { message: MESSAGES.INVALID_EMAIL });
        }

        const findUser = await User.findOne({ email: email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                console.log("OTP:", otp);
                return res.render("forgotPass-otp");
            } else {
                return res.render("forgot-password", { message: MESSAGES.OTP_SEND_FAILED });
            }
        } else {
            return res.render("forgot-password", { message: MESSAGES.USER_NOT_FOUND });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        return res.redirect("/pageNotFound");
    }
};

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            return res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            res.json({ success: false, message: MESSAGES.INVALID_OTP });
        }
    } catch (error) {
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC_ERROR });
    }
};

const getResetPassPage = async (req, res) => {
    try {
        return res.render("reset-password");
    } catch (error) {
        return res.redirect("/pageNotFound");
    }
};

const resendOtp = async (req, res) => {
    console.log("Resend otp is working, sending the request");
    try {
        const otp = generateOtp();
        console.log("resend otp generate", otp);
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(statusCode.OK).json({ success: true, message: "Resend otp successful" });
        } else {
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.OTP_SEND_FAILED });
        }
    } catch (error) {
        console.error("Error in resend otp", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({ email: email }, { $set: { password: passwordHash } });
            return res.redirect("/login");
        } else {
            return res.render("reset-password", { message: "Passwords do not match" });
        }
    } catch (error) {
        return res.redirect("/pageNotFound");
    }
};

const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });
        const totalOrders = await Order.countDocuments({ userId: userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("orderIteams.product");

        const wallet = await Wallet.find({ userId: userId }).sort({ createdAt: -1 });

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.json({
                orders,
                currentPage: page,
                totalPages,
                totalOrders,
            });
        }

        res.render("userProfile", {
            user: userData,
            userAddress: addressData,
            orders,
            wallet,
            currentPage: page,
            totalPages,
            totalOrders,
        });
    } catch (error) {
        console.error("Error retrieving profile data", error);
        return res.redirect("/pageNotFound");
    }
};

const changeEmail = async (req, res) => {
    try {
        return res.render("change-email");
    } catch (error) {
        return res.redirect("/pageNotFound");
    }
};

const changeEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.session.user;

        const currentUser = await User.findOne({ _id: userId });

        if (!currentUser) {
            return res.render("change-email", { message: MESSAGES.USER_NOT_FOUND });
        }
        if (currentUser.email != email) {
            return res.render("change-email", { message: "Please enter your current email address" });
        }
        const otp = generateOtp();
        console.log("Generated OTP:", otp);

        try {
            const emailSent = await sendVerificationEmail(email, otp);
            console.log("Email sending result:", emailSent);

            if (!emailSent) {
                console.log("Failed to send email");
                return res.json("email-error");
            }

            req.session.userOtp = otp;
            req.session.userData = req.body;
            req.session.email = email;

            console.log("OTP:", otp);
            return res.render("change-email-otp");
        } catch (emailError) {
            console.error("Error sending email:", emailError);
            return res.render("change-email", { message: MESSAGES.OTP_SEND_FAILED });
        }
    } catch (error) {
        console.error("Change email validation error:", error);
        return res.redirect("/pageNotFound");
    }
};

const verifyEmailOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (!enteredOtp || !req.session.userOtp) {
            return res.json({
                success: false,
                message: "Invalid OTP verification attempt",
            });
        }

        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            return res.json({
                success: true,
                redirectUrl: "/update-email",
            });
        } else {
            return res.json({
                success: false,
                message: MESSAGES.INVALID_OTP,
            });
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        return res.json({
            success: false,
            message: MESSAGES.GENERIC_ERROR,
        });
    }
};

const getUpdateEmailPage = async (req, res) => {
    try {
        if (!req.session.userOtp) {
            return res.redirect("/change-email");
        }
        return res.render("update-email");
    } catch (error) {
        console.error("Error loading update email page:", error);
        return res.redirect("/pageNotFound");
    }
};

const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.email;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId, { email: newEmail });
        return res.redirect("/profile");
    } catch (error) {
        console.error("The error is here", error);
        return res.redirect("/pageNotFound");
    }
};

const changePassword = async (req, res) => {
    try {
        const user = req.session.user;
        return res.render("change-password", { user: user });
    } catch (error) {
        return res.redirect("/pageNotFound");
    }
};

const changePasswordValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.session.user;

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!email || !emailPattern.test(email)) {
            return res.render("change-password", {
                user: userId,
                message: MESSAGES.INVALID_EMAIL,
            });
        }

        const currentUser = await User.findOne({ _id: userId });
        if (!currentUser) {
            console.log("Current user does not exist");
            return res.render("change-password", {
                user: null,
                message: MESSAGES.USER_NOT_FOUND,
            });
        }

        if (currentUser.email !== email) {
            console.log("Email mismatch");
            return res.render("change-password", {
                user: userId,
                message: "Please enter your current email",
            });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            req.session.userOtp = otp;
            req.session.userData = req.body;
            req.session.email = email;

            console.log("OTP:", otp);
            return res.render("change-password-otp");
        } else {
            return res.json({
                success: false,
                message: MESSAGES.OTP_SEND_FAILED,
            });
        }
    } catch (error) {
        console.error("Error in change password validation:", error);
        return res.redirect("/pageNotFound");
    }
};

const verifyChangePassOtp = (req, res) => {
    try {
        const enteredOtp = req.body.otp;

        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            return res.json({
                success: true,
                redirectUrl: "/reset-password",
            });
        } else {
            return res.json({
                success: false,
                message: MESSAGES.INVALID_OTP,
            });
        }
    } catch (error) {
        return res.json({
            success: false,
            message: MESSAGES.GENERIC_ERROR,
        });
    }
};

const addAddress = async (req, res) => {
    try {
        const user = req.session.user;
        return res.render("add-address", { user: user });
    } catch (error) {
        console.log("error inloading", error);
        return res.redirect("/pageNotFound");
    }
};

const postAddAddress = async (req, res) => {
    try {
        console.log("now you creating address");

        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        console.log(userData);

        const userAddress = await Address.findOne({ userId: userData._id });
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
            });
            await newAddress.save();
        } else {
            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
            await userAddress.save();
        }

        return res.redirect("/Profile");
    } catch (error) {
        console.error("Error adding address:", error);
        return res.redirect("/pageNotFound");
    }
};

const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        console.log(addressId);

        const user = req.session.user;
        const currAddress = await Address.findOne(
            { "address._id": addressId },
            { "address.$": 1 }
        );

        if (!currAddress) {
            console.log("current address not exist");
            return res.redirect("/pageNotFound");
        }

        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();
        });

        if (!addressData) {
            console.log("no addressData");
            return res.redirect("/pageNotFound");
        }

        return res.render("edit-address", { address: addressData, user: user });
    } catch (error) {
        console.log("Error in edit address", error);
        return res.redirect("/pageNotFound");
    }
};

const postEditAddress = async (req, res) => {
    try {
        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;

        const findAddress = await Address.findOne({ "address._id": addressId });
        if (!findAddress) {
            return res.status(404).json({ error: MESSAGES.ADDRESS_NOT_FOUND });
        }

        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$": {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        landMark: data.landMark,
                        pincode: data.pincode,
                        state: data.state,
                        phone: data.phone,
                        altPhone: data.altPhone,
                    },
                },
            }
        );

        return res.status(statusCode.OK).json({ message: "Address updated successfully" });
    } catch (error) {
        console.error("Error in edit address:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.SERVER_ERROR });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        console.log("address id", addressId);

        const findAddress = await Address.findOne({ "address._id": addressId });
        console.log("address ", findAddress);

        if (!findAddress) {
            return res.status(404).json({
                success: false,
                message: MESSAGES.ADDRESS_NOT_FOUND,
            });
        }

        await Address.updateOne(
            { "address._id": addressId },
            {
                $pull: {
                    address: {
                        _id: addressId,
                    },
                },
            }
        );

        return res.status(statusCode.OK).json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (error) {
        console.error("Error in delete address:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.ADDRESS_DELETE_ERROR,
        });
    }
};


const updateName = async (req, res) => {
    try {
        res.render("change-name");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const changeName = async (req, res) => {
    try {
        console.log("now editing the name");

        const userId = req.session.user;
        console.log(userId);

        const newName = req.body.name;
        console.log(newName);

        console.log("user id :", userId);
        const updateUser = await User.updateOne({ _id: userId }, { name: newName });

        if (!updateUser) {
            console.log("user not found");
        } else {
            console.log("updated user");
        }
        res.redirect("/Profile");
    } catch (error) {
        console.error("Error updating user:", error);
        res.redirect("/pageNotFound");
    }
};

export {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    getUpdateEmailPage,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    updateName,
    changeName,
};