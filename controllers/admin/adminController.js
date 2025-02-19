const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const filterSalesReportAdmin = require('../../helpers/filterSalesReportAdmin');

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin', {message:null});
}

const login =  async(req,res)=>{
    try { 
        const {email, password} = req.body;
        console.log(req.body)
        const admin = await User.findOne({email, isAdmin:true})
        if(admin){
            const passwordMatch = bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin =  true;
                return res.redirect('/admin')
            }else{
                return res.redirect('/admin/login')
            }
        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.error("Error while login", error)
        return res.redirect('/pageError')        
    }
}


const pageError = (req,res)=>{
    res.render('adminError')
}

const logout = async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log("Error while destroying session",err.message)
                return res.redirect("/pageNotFound")
            }
            console.log("after", res.session)
            return res.redirect('/admin/login')
        })
    }catch(error){
        console.log("Unexpected Error during logout", error)
        res.redirect("/pageNotFound")
    }
}

const loadDashboard = async (req, res) => {
    try {
      console.log("dashboard rendered")
      const filter  = req.query.day==undefined? "salesDaily": req.query.day;
      const groupBy = filterSalesReportAdmin.chartFilter(filter);
        console.log("groupBy rendered",filter, groupBy);
      let page=1;

    //   const salesData = await Order.aggregate([
    //     { 
    //       $unwind: "$orderedItems" 
    //     },
    //     { 
    //       $match: { 
    //         status: "Verified", 
    //         "orderedItems.productStatus": "Delivered" 
    //       } 
    //     },
    //     { 
    //       $group: {
    //         _id: groupBy, 
    //         totalSales: { $sum: "$totalPrice" }, 
    //         totalDiscount: { $sum: "$discount" }, 
    //         totalFinalAmount: { $sum: "$finalAmount" }
    //       }
    //     },
    //     { $sort: { _id: 1 } } 
    //   ]);


      
      
    //       const result = await Order.aggregate([
    //         {
    //           $match: {
    //             status: "Verified",
    //             "orderedItems.productStatus": "Delivered",
    //           },
    //         },
    //         { $unwind: "$orderedItems" },
      
    //         // Lookup to fetch product details
    //         {
    //           $lookup: {
    //             from: "products",
    //             localField: "orderedItems.product",
    //             foreignField: "_id",
    //             as: "productDetails",
    //           },
    //         },
    //         { $unwind: "$productDetails" },
      
    //         // Lookup to fetch category details
    //         {
    //           $lookup: {
    //             from: "categories",
    //             localField: "productDetails.category",
    //             foreignField: "_id",
    //             as: "categoryDetails",
    //           },
    //         },
    //         { $unwind: "$categoryDetails" },
      
    //         {
    //           $facet: {
    //             // Best-Selling Categories (Top 3)
    //             bestCategories: [
    //               {
    //                 $group: {
    //                   _id: "$categoryDetails.name", // Use category name
    //                   totalSold: { $sum: "$orderedItems.quantity" },
    //                 },
    //               },
    //               { $sort: { totalSold: -1 } },
    //               { $limit: 3 },
    //             ],
      
    //             // Best-Selling Brands (Top 3)
    //             bestBrands: [
    //               {
    //                 $group: {
    //                   _id: "$productDetails.brand", // Use brand name
    //                   totalSold: { $sum: "$orderedItems.quantity" },
    //                 },
    //               },
    //               { $sort: { totalSold: -1 } },
    //               { $limit: 3 },
    //             ],
      
    //             // Best-Selling Products (Top 3)
    //             bestProducts: [
    //               {
    //                 $group: {
    //                   _id: "$productDetails.productName", // Use product name
    //                   totalSold: { $sum: "$orderedItems.quantity" },
    //                 },
    //               },
    //               { $sort: { totalSold: -1 } },
    //               { $limit: 3 },
    //             ],
    //           },
    //         },
    //       ]);
      

    const result = await Order.aggregate([
        {
          $match: {
            status: "Verified",
            "orderedItems.productStatus": "Delivered",
          },
        },
        { $unwind: "$orderedItems" },
      
        // Lookup to fetch product details
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
      
        // Lookup to fetch category details
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
          $group: {
            _id: groupBy, // Group by dynamic field
            totalSales: { $sum: "$totalPrice" },
            totalDiscount: { $sum: "$discount" },
            totalFinalAmount: { $sum: "$finalAmount" },
            bestCategories: {
              $push: {
                category: "$categoryDetails.name",
                quantity: "$orderedItems.quantity",
              },
            },
            bestBrands: {
              $push: {
                brand: "$productDetails.brand",
                quantity: "$orderedItems.quantity",
              },
            },
            bestProducts: {
              $push: {
                product: "$productDetails.productName",
                quantity: "$orderedItems.quantity",
              },
            },
          },
        },
      
        // Process best-selling categories, brands, and products using $facet
        {
          $project: {
            _id: 1,
            totalSales: 1,
            totalDiscount: 1,
            totalFinalAmount: 1,
            bestCategories: {
              $slice: [{ $sortArray: { input: "$bestCategories", sortBy: { quantity: -1 } } }, 3],
            },
            bestBrands: {
              $slice: [{ $sortArray: { input: "$bestBrands", sortBy: { quantity: -1 } } }, 3],
            },
            bestProducts: {
              $slice: [{ $sortArray: { input: "$bestProducts", sortBy: { quantity: -1 } } }, 3],
            },
          },
        },
      
        { $sort: { _id: 1 } },
      ]);
      
          console.log("Best Selling Data:", JSON.stringify(result, null, 2));
         
      


      
      res.render("dashboard",{
        data: result,
      })
      
    } catch (error) {
      console.error("Error while loading the dashboard", error);
      res.redirect("/admin/pageError");
      
    }
  }

  const salesChart  = async (req,res) =>{
    try {
        const filter = req.query.day;

        
        
    } catch (error) {
        console.error("error while loading the sales chart", error);
        res.redirect("/admin/pageError");
        
    }
  }

module.exports = {
    loadLogin,
    login,
    pageError,
    logout,
    loadDashboard,
    salesChart
}