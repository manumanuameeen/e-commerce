import { render } from "ejs";



const loadHomepage =async (req,res) => {
    try {
 
return res.render("home")

    } catch (error) {
        console.log("home page not found");
        res.status(500).send("service error")
    }
}

const loadpageNotFound = async (req,res) => {
    
    try {
        return res.render('pageNotFound')
        
    } catch (error) {

        res.redirect("/pageNotFound")   

    }
}


export {
    loadHomepage,
    loadpageNotFound,
}