import { query } from "express";
import User from "../../models/userSchema.js";


const customerinfo = async (req, res) => {

    try {


        let search = "";

        if (req.query.search) {
            search = req.query.search
        }
        let page = 1;
        if (req.query.page) {
            page = req.query.page
        }
        const limit =3;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { eamil: { $regex: ".*" + search + ".*" } }
            ]
        })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } }
            ],
        }).countDocuments();


        res.render("customers", { data: userData, totalPages: count, currentPage: page })


    } catch (error) {
        console.log("errororororo", error);

    }
}

const blockCustomer = async (req, res) => {


    try {
console.log();

        let id = req.query.id;
        console.log(id);
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        console.log("user is blocked");

        return res.redirect("/admin/users")


    } catch (error) {
        res.redirect("/pageerror")
        console.log("somthing happedn in the time user isblock upadating moment", error);

    }

}


const unBlockCustomer = async (req, res) => {

    try {

        
        let id = req.query.id
       
        
        console.log("user id by ");
        
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } })
        console.log("user unblocked successfully");
        return res.redirect("/admin/users")
    } catch (error) {
        console.log("errro happedn when updating the user");
        res.redirect("/pageerror");
    }

}
export {

    customerinfo,
    blockCustomer,
    unBlockCustomer,

}