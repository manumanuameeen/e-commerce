import User from "../models/userSchema.js";


const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                return res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware");
            res.status(500).send("Intenal server error")
        })
    }else{
        return redirect("/login")
    }
}
const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then((data)=>{
        if(data){
            next();
        }else{
            return res.redirect("/admin/login")
        }
    })
    .catch((error)=>{
    console.log("error in adminAuth middleware",error);
    return res.status(500).send("Internal server error")
    
    })
}

export{
    adminAuth,
    userAuth,

}