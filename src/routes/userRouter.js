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


import{
        loadProfile,
        updateProfile,
        loadUpdateProifle,
        loadVerify,
        


}from "../controllers/users/profileController.js"


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
router.get("/profile",userAuth,loadProfile)
router.get("/update-email",userAuth,loadUpdateProifle)
router.get("/update-email",userAuth,updateProfile)
router.get("/email-otp",userAuth,loadVerify)
export default router;