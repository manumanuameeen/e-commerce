import User from "../../models/userSchema.js";

import mongoose from "mongoose";

import bcrypt from "bcrypt"



const loadPageerror = async (req, res) => {
    try {
        return res.render("pageerror")
    } catch (error) {
        console.log("Error in pageerror ", error);


    }
}


const loadlogin = async (req, res) => {

    try {
        if (req.session.admin) {
            return res.redirect("/admin")
        }
        return res.render("admin-login", { message: null })
    } catch (error) {
        console.log('Error loading admin login:', error);
        res.status(500).send('Internal Server Error');

    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true })

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true
                return res.redirect('/admin')
            } else {
                return res.redirect("/admin//login")
            }

        } else {
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log("Login error", error)
        return res.redirect("/pageerror")
    }

}

const loaddashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.render("adminDashboard")
        }
    } catch (error) {
        return res.redirect("/pageerror")
    }
}


const logout = async (req, res) => {
    try {
        console.log("before", req.session.admin)
        req.session.destroy((err) => {

            if (err) {
                console.log("Error destroying session", err);
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")

        })
    } catch (error) {
        console.log("unexpected Error", error);
        res.redirect("/pageerror")
    }
}




export {
    loadlogin,
    login,
    loaddashboard,
    loadPageerror,
    logout,

}