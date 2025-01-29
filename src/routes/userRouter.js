import express from "express"
const router = express.Router()

import {
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


} from "../controllers/users/userController.js"

import {
        productDetails,

} from "../controllers/users/productController.js"


import {

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
        viewOrderDetails,
        cancelOrder,
        updateName,
        changeName,


} from "../controllers/users/profileController.js"


import {

        addToCart,
        loadCart,
        updateCartQuantity,
        removeFromCart,

} from "../controllers/users/cartController.js"


import{
        getChekout,
        checkoutAddress,
        

} from '../controllers/users/checkoutController.js'

import passport from "passport";

import { userAuth } from "../middlewares/auth.js";


router.get("/pageNotFOund", loadpageNotFound);
//home,signup,resend otp,verifyotp
router.get("/", loadHomepage)
router.get('/signup', loadsignup)
router.post('/signup', signup)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendotp);
//googlw auth
router.get('/auth/google', passport.authenticate("google", { scope: ["profile", "email"] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
        req.session.user = req.user._id;
        req.session.save((err) => {
                if (err) {
                        console.log("session save error", err);
                        return res.redirect('/signup');
                }
                res.redirect("/")
        })
});

//login,logout managment
router.get('/login', loadlogin)
router.post("/login", login)
router.get('/logout', loadlogout);
//shop
router.get('/shop', loadShopingPage)
router.get('/filter', filterProduct)
router.get('/filterPrice', filterByPrice)
router.post("/search", searchProduct)

//product detailes
router.get("/productDetails", productDetails)


//profile management 


router.get("/forgot-password", getForgotPassPage);
router.post("/forgot-email-valid", forgotEmailValid);
router.post("/verify-passForgot-otp", verifyForgotPassOtp)
router.get("/reset-password", getResetPassPage);
router.post("/resend-forgot-otp", resendOtp);
router.post("/reset-password", postNewPassword);
router.get("/Profile", userAuth, userProfile);
router.get("/change-email", userAuth, changeEmail)
router.post("/change-email", userAuth, changeEmailValid);
router.post("/verify-email-otp", userAuth, verifyEmailOtp);
router.get("/update-email", userAuth, getUpdateEmailPage);
router.post("/update-email", userAuth, updateEmail)
router.get("/change-password", userAuth, changePassword);
router.post("/change-password", userAuth, changePasswordValid)
router.post("/verify-changePassword-otp", userAuth, verifyChangePassOtp);

router.get("/update-name", userAuth, updateName)
router.post("/update-name", userAuth, changeName)

//address  management
router.get("/addAddress", userAuth, addAddress)
router.post("/addAddress", userAuth, postAddAddress);
router.get("/editAddress", userAuth, editAddress);
router.post("/editAddress", userAuth, postEditAddress);
router.get("/deleteAddress", userAuth, deleteAddress);

//order 
router.get("/orderDetails/:orderId", userAuth, viewOrderDetails);
router.post("/cancelOrder/:orderId", userAuth, cancelOrder);




// cart Mangement 
router.get('/cart', userAuth, loadCart)
router.post('/addToCart', userAuth, addToCart)
router.post("/updateQuantity/:cartItemId", userAuth, updateCartQuantity);
router.delete("/removeFromCart/:cartItemId", userAuth, removeFromCart);


//checkout
router.get('/checkout',userAuth,getChekout)
router.post('/checkout-address',userAuth,checkoutAddress)

export default router;