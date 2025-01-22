// import { assign } from "nodemailer/lib/shared/index.js";
import User from "../../models/userSchema.js";
import nodemailer from "nodemailer"
import env from "dotenv"
import bcrypt from "bcrypt"





const loadProfile =async (req,res) => {

try {
    const userId = req.session.user;

    const userData = await User.findById(userId)
res.render("userProfile",{
    user:userData
})
} catch (error) {
    console.error(error);
    res.redirect('/pageNotFound')
    
}
    
}

const loadUpdateProifle =async (req,res) => {
    

    try {
        res.render('profile-emailEdit')
    } catch (error) {
res.redirect("/pageNotFound")
    }
}

const updateProfile  = async (req,res) => {
    

    try {
        const {name,email,phone}= req.body
      console.log(name,email,phone)
        const userId = req.session.user;

console.log(userId);




    } catch (error) {
        res.redirect('/pageNotFound')
    }
}




const loadVerify =async (req,res) => {
    
    try {
        res.render('email-otp')
    } catch (error) {
        res.redirect('/pageNotFound  ')
    }
}


export{
loadProfile,
updateProfile,
loadUpdateProifle,
loadVerify,

}