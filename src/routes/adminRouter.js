import express from "express"

const router = express.Router()
import {
    userAuth,
    adminAuth,
} from "../middlewares/auth.js"

import {
    loadlogin,
    login,
    loaddashboard,
    loadPageerror,
    logout,


} from "../controllers/admin/adminController.js"

import {
    customerinfo,
    unBlockCustomer,
    blockCustomer,

} from "../controllers/admin/customerController.js"

import {

    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getunListCategory,
    getEditcategory,
    editCategory

} from "../controllers/admin/categoryController.js.js"



router.get('/pageerror', loadPageerror)

router.get('/login', loadlogin)
router.post('/login', login)
router.get('/', adminAuth, loaddashboard)
router.get("/logout", logout)

router.get("/users", adminAuth, customerinfo);
router.get('/blockCustomer', adminAuth, blockCustomer)
router.get('/unBlockCustomer', adminAuth, unBlockCustomer)

router.get("/category", adminAuth, categoryInfo)
router.post("/addCategory", adminAuth, addCategory)
router.post("/addCategoryOffer", addCategoryOffer)
router.post("/removeCategoryOffer", removeCategoryOffer)
router.get('/listCategory', adminAuth, getListCategory)
router.get('/unListCategory', adminAuth, getunListCategory)
router.get("/edit-Category", adminAuth, getEditcategory)
router.post("/edit-Category/:id", adminAuth, editCategory);


export default router;  