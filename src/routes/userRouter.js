import express from "express"
const router = express.Router()  
import { loadHomepage,
        loadpageNotFound,
 } from "../controllers/users/userController.js"


router.get("/pageNotFOund",loadpageNotFound)

router.get("/",loadHomepage )

export default  router   