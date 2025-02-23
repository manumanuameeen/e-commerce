import User from "../models/userSchema.js";


const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(401).json({
                    status: false,
                    loginRequired: true,
                    message: "Please login to continue"
                });
            }
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
        }

        const user = await User.findById(req.session.user);
        if (!user || user.isBlocked) {
            req.session.destroy();
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(401).json({
                    status: false,
                    loginRequired: true,
                    message: "User account is not accessible"
                });
            }
            return res.redirect('/login');
        }

        next();
    } catch (error) {
        console.error("Error in user auth middleware:", error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                status: false,
                message: "Internal Server Error"
            });
        }
        res.status(500).send("Internal Server Error");
    }
};

const adminAuth = async (req, res, next) => {
    try {
        const adminamama= req.session.admin
   console.log();
   
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

     
        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect("/admin/login");
            
        }

        next();
    } catch (error) {
        console.error("Error in adminAuth middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};

export {
    adminAuth,
    userAuth
}