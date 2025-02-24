const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const filterSalesReportAdmin = require('../../helpers/filterSalesReportAdmin');

//render the loginPage
const loadLogin = (req,res)=>{
  try{
    if(req.session.admin){
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin', {message:null});
    }catch(error){
        console.error("Error while rendering login page", error)
        return res.redirect('/pageNotFound')
    }
}

//admin login
const login =  async(req,res)=>{
    try { 
        const {email, password} = req.body;
        console.log(req.body)
        const admin = await User.findOne({email, isAdmin:true})
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password)
            console.log("passwordMatch",passwordMatch)
            if(passwordMatch){
                req.session.admin =  true;
                return res.redirect('/admin')
            }else{
                console.log("Incorrect Password")
                return res.render('adminLogin', {message:"Incorrect Password"})
            }
        }else{
            console.log("User not found")
            return res.render('adminLogin', {message:"User not found"})
        }
    } catch (error) {
        console.error("Error while login", error)
        return res.redirect('/pageError')        
    }
}

//render the admin error page
const pageError = (req,res)=>{
  try{
    res.render('adminError')
    console.log("Rendering the adminPageError page")
  }catch(error){
    console.log("Error while rendering pageError", error)
    return res.redirect('/pageNotFound')
  }
}

//admin logout
const logout = async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log("Error while destroying session",err.message)
                return res.redirect("/pageNotFound")
            }
            console.log("Admin logout", res.session)
            return res.redirect('/admin/login')
        })
    }catch(error){
        console.log("Unexpected Error during logout", error)
        res.redirect("/pageNotFound")
    }
}

//dashboard including charts 
const loadDashboard = async (req, res) => {
    try {
      console.log("dashboard rendered")
      const filter  = req.query.day==undefined? "salesDaily": req.query.day;
      const groupBy = filterSalesReportAdmin.chartFilter(filter);
      console.log("groupBy rendered",filter, groupBy);
      let page=1;
      const [salesData, result] = await Promise.all([ 
        Order.aggregate([
        { 
          $unwind: "$orderedItems" 
        },
        { 
          $match: { 
            status: "Verified", 
            "orderedItems.productStatus": "Delivered" 
          } 
        },
        { 
          $group: {
            _id: groupBy, 
            totalSales: { $sum: "$totalPrice" }, 
            totalDiscount: { $sum: "$discount" }, 
            totalFinalAmount: { $sum: "$finalAmount" }
          }
        },
        { $sort: { _id: 1 } } 
      ]),
           Order.aggregate([
            {
              $match: {
                status: "Verified",
                "orderedItems.productStatus": "Delivered",
              },
            },
            { $unwind: "$orderedItems" },     
            // lookup for fetch product details
            {
              $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: "$productDetails" },    
            // lookup for fetch category details
            {
              $lookup: {
                from: "categories",
                localField: "productDetails.category",
                foreignField: "_id",
                as: "categoryDetails",
              },
            },
            { $unwind: "$categoryDetails" },      
            {
              $facet: {
                // Categories 
                bestCategories: [
                  {
                    $group: {
                      _id: "$categoryDetails.name", 
                      totalSold: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalSold: -1 } },
                  { $limit: 3 },
                ],
                //  Brands 
                bestBrands: [
                  {
                    $group: {
                      _id: "$productDetails.brand", 
                      totalSold: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalSold: -1 } },
                  { $limit: 3 },
                ],      
                //  Products 
                bestProducts: [
                  {
                    $group: {
                      _id: "$productDetails.productName", 
                      totalSold: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalSold: -1 } },
                  { $limit: 3 },
                ],
              },
            },
          ]),   
        ]);  
         //console.log("Best Selling Data:", JSON.stringify(result, null, 2));         
      res.render("dashboard",{
        data: salesData,
        bestSellingData:result,
        filter: filter  
      })     
    } catch (error) {
      console.error("Error while loading the dashboard", error);
      res.redirect("/admin/pageError");   
    }
  }

module.exports = {
    loadLogin,
    login,
    pageError,
    logout,
    loadDashboard, 
}