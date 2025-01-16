const express = require('express');
const app = express();
const env = require("dotenv").config();
const db = require("./config/db");
const ejs = require('ejs');
const path = require('path');
const userRouter = require('./routes/userRouter');
const logger =  require('morgan');
const session =require('express-session');
const passport = require('./config/passport');
const adminRouter = require('./routes/adminRouter');
db();



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}));
app.use((req,res,next)=>{
    res.set("caceh-control",'no-store');
    next();
})

app.use(passport.initialize());
app.use(passport.session())

app.set("view engine", "ejs")
app.set("views", [path.join(__dirname, 'views/user'),path.join(__dirname,'views/admin')])
//app.use(express.static(path.join(__dirname, "public")))
app.use(express.static('public'));
app.use("/uploads/brands", express.static(path.join(__dirname, "../../GentzGalleryApp/public/uploads/brands")));
app.use("/uploads/product-imagesResized", express.static(path.join(__dirname, "../../GentzGalleryApp/public/uploads/product-imagesResized")));



app.use('/',userRouter)
app.use('/admin',adminRouter)

app.listen(process.env.PORT, ()=>{
    console.log("server running at ",process.env.PORT )
})

module.exports = app;   

