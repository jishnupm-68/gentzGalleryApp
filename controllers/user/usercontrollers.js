const { render } = require("../../app")

const loadHomePage = async(req,res)=>{
    try{
        console.log("ok")
        return res.render("home")
    }catch(error){
        console.log("home page not found");
        res.status(500).send("server error");
    }
}



const pageNotFound = (req,res)=>{
    try{
    res.render('page-404')
    }catch(error){
    res.redirect('/pageNotFound')
    }
}
module.exports = {
    loadHomePage,
    pageNotFound
}