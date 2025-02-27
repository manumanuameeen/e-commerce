import express from "express"

const router = express.Router()

import multer from "multer";

import storage from "../helpers/multer.js"

const uploads = multer({ storage: storage });
import {
    userAuth,
    adminAuth,
} from "../middlewares/auth.js"

import {
    loadlogin,
    login,
    loadDashboard,
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




import {

    getProductAddPage,
    addProducts,
    getAllProduct,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    

} from "../controllers/admin/productControlller.js"


import {
    loadOrder,
    updateOrderStatus,
    orderDetails,
    handleReturnRequest
} from "../controllers/admin/orderManagement.js"




import { 

    loadCoupon,
    createCoupon,
    deleteCoupon,
    editCoupon,
    
 } from "../controllers/admin/couponController.js";

import{
    LoadOffer,
    addOffer,
    offerList,
    removeOffer,
    editOffer,

} from "../controllers/admin/offerController.js"






router.get('/pageerror', loadPageerror)
//Login  management
router.get('/login', loadlogin)
router.post('/login', login)
router.get('/', adminAuth, loadDashboard)
router.get("/logout", logout)
//coustomer Mangemanet
router.get("/users", adminAuth, customerinfo);
router.get('/blockCustomer', adminAuth, blockCustomer)
router.get('/unBlockCustomer', adminAuth, unBlockCustomer)
//category Mangement
router.get("/category", adminAuth, categoryInfo)
router.post("/addCategory", adminAuth, addCategory)
router.post("/addCategoryOffer", addCategoryOffer)
router.post("/removeCategoryOffer", removeCategoryOffer)
router.get('/listCategory', adminAuth, getListCategory)
router.get('/unListCategory', adminAuth, getunListCategory)
router.get("/edit-Category", adminAuth, getEditcategory)
router.post("/edit-Category/:id", adminAuth, editCategory);
//products management
router.get("/addProducts", adminAuth, getProductAddPage)
router.post("/addProducts", uploads.any(), adminAuth, addProducts)
router.get("/products", adminAuth, getAllProduct)
router.get("/blockProduct",adminAuth,blockProduct)
router.get("/unBlockProduct",adminAuth,unBlockProduct)
router.get("/edit-Product",adminAuth,getEditProduct)
router.post("/edit-Product/:id",adminAuth,uploads.any("images",4),editProduct)
router.post("/deleteImage",adminAuth,deleteSingleImage)


//order management

router.get("/order", adminAuth, loadOrder);
router.post("/order/:orderId", adminAuth, updateOrderStatus);
router.get('/orderDetails/:id',adminAuth,orderDetails)
router.post('/return-request/:orderId', adminAuth, handleReturnRequest);
 
//coupon mangement 
router.get('/coupon',adminAuth,loadCoupon)
router.post('/coupon',adminAuth,createCoupon)
router.delete('/coupon/:couponId',adminAuth,deleteCoupon)
router.put('/coupon/:couponId', editCoupon); 

//offer management
router.get("/offer",adminAuth,LoadOffer)
router.post("/offer",adminAuth,addOffer)
router.get("/offer-list",adminAuth,offerList)
router.delete("/remove-offer/:Id",adminAuth,removeOffer)
router.put('/update-offer/:id',editOffer);
export default router;  

