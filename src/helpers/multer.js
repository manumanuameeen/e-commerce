import multer from "multer";

import path from "path"

const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, path.join(__dirname, "../public/uploads/re-image"));
    },
    filename: (req, res, cd) => {
        cb(null, Date.now() + "." + file.orginalname);
    }
})
export{
    storage,

}
