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

} from "../controllers/users/userController.js"
import passport from "passport";


router.get("/pageNotFOund", loadpageNotFound);
router.get("/", loadHomepage)
router.get('/signup', loadsignup)
router.post('/signup', signup)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendotp);

router.get('/auth/google', passport.authenticate("google", { scope: ["profile", "email"] }));
router.get('/auth/google/callback', passport.authenticate("google", { failureRedirect: "/signup", }), (req, res) => { return res.redirect("/") })

router.get('/login', loadlogin)
router.post("/login", login)

router.get('/logout', loadlogout);
export default router   