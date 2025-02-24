import express from "express"
const router = express.Router()
import User from "../models/userSchema.js"
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
       


} from "../controllers/users/userController.js"

import {
        productDetails,
        getWishlist,
        addWishlist,
        removeFromWishlist,

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
        placeOrder,
        orderSuccess,
        orderDetails,
        orderCancel,
        createRazorpayOrder,
        verifyRazorpayPayment,
        requestReturn
        ,cancelOrderItem,
        handlePaymentDismissal,


} from '../controllers/users/checkoutController.js'

import passport from "passport";

import { userAuth } from "../middlewares/auth.js";
import { applyCoupon,removeCoupon } from "../controllers/users/couponController.js"



router.get("/pageNotFOund", loadpageNotFound);
//home,signup,resend otp,verifyotp
router.get("/", loadHomepage)
router.get('/signup', loadsignup)
router.post('/signup', signup)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendotp);
//googlw auth
router.get('/auth/google', passport.authenticate("google", { scope: ["profile", "email"] }));

router.get('/auth/google/callback', 
        passport.authenticate('google', { 
            failureRedirect: '/signup',
            failureMessage: true 
        }), 
        async (req, res) => {
            try {
                const user = await User.findById(req.user._id);
                
                if (user.isBlocked) {
                    req.logout((err) => {
                        if (err) console.log("Logout error:", err);
                    });
                    return res.render('signup', { 
                        message: "Your account has been blocked by admin" 
                    });
                }
    
                req.session.user = req.user._id;
                req.session.save((err) => {
                    if (err) {
                        console.log("session save error", err);
                        return res.redirect('/signup');
                    }
                    res.redirect("/");
                });
            } catch (error) {
                console.log("Google auth error:", error);
                res.redirect('/signup');
            }
        }
    );

//login,logout managment
router.get('/login', loadlogin)
router.post("/login", login)
router.get('/logout', loadlogout);
//shop
router.get('/shop', loadShopingPage)


//product detailes
router.get("/productDetails", productDetails)


//brand


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
router.patch("/editAddress", userAuth, postEditAddress);
router.delete("/deleteAddress/:id", userAuth, deleteAddress);
 
 
// cart Mangement 
router.get('/cart', userAuth, loadCart)
router.post('/addToCart', userAuth, addToCart)
router.patch("/updateQuantity/:cartItemId", userAuth, updateCartQuantity);
router.delete("/removeFromCart/:cartItemId", userAuth, removeFromCart);


//checkout
router.get('/checkout',userAuth,getChekout)
router.post('/checkout-address',userAuth,checkoutAddress)
router.post('/placeOrder',userAuth,placeOrder)
//razorpay
router.post('/create-razorpay-order', createRazorpayOrder);
router.post('/verify-razorpay-payment', verifyRazorpayPayment);
router.post('/handle-payment-dismissal', handlePaymentDismissal);
//order
router.get('/orderSuccess', userAuth, orderSuccess);
router.get('/order-details/:orderId', userAuth, orderDetails);
router.patch("/orderCancel/:orderId", userAuth, orderCancel);
router.patch('/requestReturn/:orderId', userAuth, requestReturn);
router.patch('/cancelOrderItem/:orderId/:itemId', userAuth, cancelOrderItem);


//wishlist
router.get('/wishlist',userAuth,getWishlist)
router.post('/addWishlist', addWishlist);
router.delete('/removeFromWishlist',userAuth, removeFromWishlist);


//coupone

router.post("/apply-coupon",userAuth,applyCoupon)
router.delete("/remove-coupon",userAuth,removeCoupon)
 

export default router;
