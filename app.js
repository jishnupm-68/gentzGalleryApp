const express = require('express');
const app = express();
const env = require("dotenv").config();
const db = require("./config/db");
const ejs = require('ejs');
const path = require('path');
const userRouter = require('./routes/userRouter');
const logger =  require('morgan')

db();



app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended : true}))

app.set("view engine", "ejs")
app.set("views", [path.join(__dirname, 'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname, "public")))


app.use('/',userRouter)

app.listen(process.env.PORT, ()=>{
    console.log("server running at ",process.env.PORT )
})

module.exports = app;   

