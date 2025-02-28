const Coupon = require("../../models/couponSchema");
const mongoose = require('mongoose');

//function for render the coupon page
const loadCouponPage = async(req,res)=>{
    try {
        console.log("rendered coupon page")
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let skipCount = (currentPage - 1) * itemsPerPage;
        const [totalCoupons, currentCoupons] = await Promise.all([
            Coupon.countDocuments(), 
            Coupon.find() 
                .sort({expireOn:-1})
                .skip(skipCount)
                .limit(itemsPerPage)
                .lean()
        ]);
        const totalPages = Math.ceil(totalCoupons / itemsPerPage);  
        res.render("coupon", {coupons:currentCoupons, currentPage:currentPage, totalPages:totalPages});   
    } catch (error) {
        console.error("error while rendering the coupon page",error)
        res.redirect('/admin/pageError')     
    }
}

// function for rendering adding new coupon page
const loadAddCoupon = async (req,res)=>{
    try {
        console.log("rendered add coupon page")
        res.render('addCoupon')
    } catch (error) {
        console.error("error while rendering the add coupon page",error)
        res.redirect('/admin/pageError')    
    }
}

//function for creating new coupon
const createCoupon = async(req,res)=>{
    try {
        const data=  {
            name: req.body.couponName,
            createdOn: req.body.startDate,
            expireOn: req.body.endDate,
            percentageOffer: parseInt(req.body.percentageOffer), 
            offeredPrice: parseInt(req.body.offeredPrice),
            minimumPrice: parseInt(req.body.minimumPrice)
        }
        const newCoupon = new Coupon(data);
        await newCoupon.save();
        res.json({success:true, message:"Coupon saved successfully"})
    } catch (error) {
        console.error("error while creating a coupon",error)
        res.json({success:false, message:"Error while adding new coupon"})     
    }
}

//function for rendering the edit coupon page
const loadEditCoupon = async(req,res)=>{
    try {
        const id = req.query.id
        const coupon = await Coupon.findById(id)
        res.render('editCoupon',{coupon})
        console.log("rendered edit coupon page")
    } catch (error) {
        console.log("Error while rendering the edit coupon page",error)
        res.redirect('/admin/pageError')
    }
}

//function for updating the coupon
const updateCoupon = async(req,res)=>{
    try {
        const {couponId, couponName, startDate, endDate, offeredPrice, minimumPrice} = req.body;
        let percentage =parseInt(req.body.percentageOffer)
        let percentageOffer;
        percentageOffer = (isNaN(percentage) || percentage === null) ? 0 : percentage;
        const findCoupon = await Coupon.findByIdAndUpdate({_id:couponId}, 
            {
                name: couponName,
                createdOn: new Date(startDate),
                expireOn: new Date(endDate),
                percentageOffer: parseInt(percentageOffer),
                offeredPrice: parseInt(offeredPrice),
                minimumPrice: parseInt(minimumPrice)
            },
            {new: true}
        );
        if(findCoupon){
            console.log("Coupon updated successfully")
            res.json({success:true, message:"Coupon updated successfully", redirectUrl:"/admin/coupon"})
        }else{
            console.log("Coupon not updated")
            res.json({success:false, message:"Coupon updation failed"})
        }
    } catch (error) {
        console.log("Error while rendering the edit coupon page",error)
        res.redirect('/admin/pageError')
    }
}

//function for deleting the coupon
const deleteCoupon = async(req,res)=>{
    try {
        const  couponId = req.query.id;
        const deleteCoupon = await Coupon.findByIdAndDelete(couponId);
        if(deleteCoupon){
            console.log("coupon deleted successfully");
            res.json({success:true, message:"Coupon deleted successfully"})
        }else{
            console.log("coupon deletion failed");
            res.json({success:false, message:"Coupon deletion failed"}) 
        }        
    } catch (error) {
        console.error("Error while deleting the coupon",error)
        res.json({success:false, message:"Error while deleting the coupon "})   
    }
}

//function for listing the coupon
const listCoupon = async(req,res)=>{
    try {
        const couponId = req.query.id;
        const coupon = await Coupon.findByIdAndUpdate(
            {_id:couponId},
            {$set:
                {isListed:true}
             },
             {new: true}
        )
        if(coupon){
            console.log("Coupon listed successfully")
            res.json({success:true, message:"Coupon listed successfully"})
        } else {
            console.log("Coupon listing failed")
            res.json({success:false, message:"Coupon listing failed"})
        }
        
    } catch (error) {
        console.error("Error while listing coupon",error);
        res.redirect("/admin/pageError")
    }
}

//function for unlisting the coupon
const unlistCoupon = async(req,res)=>{
    try {
        const couponId = req.query.id;
        const coupon = await Coupon.findByIdAndUpdate(
            {_id:couponId},
            {$set:
                {isListed:false}
             },
             {new: true}
        )
        if(coupon){
            console.log("Coupon unlisted successfully")
            res.json({success:true, message:"Coupon unlisted successfully"})
        } else {
            console.log("Coupon unlisting failed")
            res.json({success:false, message:"Coupon unlisting failed"})
        }
    } catch (error) {
        console.error("Error while unlisting coupon",error);
        res.redirect("/admin/pageError")
    }
}

//exporting the functions 
module.exports = {
    loadCouponPage,
    loadAddCoupon,
    createCoupon,
    loadEditCoupon,
    updateCoupon,
    deleteCoupon,
    listCoupon,
    unlistCoupon
}