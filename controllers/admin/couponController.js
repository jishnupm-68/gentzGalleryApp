const Coupon = require("../../models/couponSchema");
const mongoose = require('mongoose');

const loadCouponPage = async(req,res)=>{
    try {
        console.log("rendered coupon page")
        const coupons = await Coupon.find({})
        res.render('coupon',{coupons})        
    } catch (error) {
        console.error("error while rendering the coupon page",error)
        res.redirect('/admin/pageError')     
    }
}

const loadAddCoupon = async (req,res)=>{
    try {
        console.log("rendered add coupon page")
        res.render('addCoupon')
        
    } catch (error) {
        console.error("error while rendering the add coupon page",error)
        res.redirect('/admin/pageError')
        
    }
}

const createCoupon = async(req,res)=>{
    try {
        const data=  {
            name: req.body.couponName,
            createdOn: req.body.startDate,
            expireOn: req.body.endDate,
            offeredPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice)
        }
        const newCoupon = new Coupon(data);
        await newCoupon.save();
        res.redirect('/admin/coupon')

        
    } catch (error) {
        console.error("error while creating a coupon",error)
        res.redirect('/admin/pageError')
        
    }
}


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



const updateCoupon = async(req,res)=>{
    try {
        const {couponId, couponName, startDate, endDate, offerPrice, minimumPrice} = req.body;
        console.log("Rendered the edit coupon page",req.body)
        const findCoupon = await Coupon.findByIdAndUpdate({_id:couponId}, 
            {
                name: couponName,
                createdOn: new Date(startDate),
                expireOn: new Date(endDate),
                offeredPrice: parseInt(offerPrice),
                minimumPrice: parseInt(minimumPrice)
            },
            {new: true}
        );
        if(findCoupon){
            res.json({success:true, message:"Coupon updated successfully", redirectUrl:"/admin/coupon"})
        }else{
            res.json({success:false, message:"Coupon updation failed"})
        }
    } catch (error) {
        console.log("Error while rendering the edit coupon page",error)
        res.redirect('/admin/pageError')
    }
}


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
        res.redirect('/admin/pageError')     
    }
}

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
            res.json({success:true, message:"Coupon listed successfully"})
        } else {
            res.json({success:false, message:"Coupon listing failed"})
        }
        
    } catch (error) {
        console.error("Error while listing coupon",error);
        res.redirect("/admin/pageError")
    }
}


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
            res.json({success:true, message:"Coupon unlisted successfully"})
        } else {
            res.json({success:false, message:"Coupon listing failed"})
        }
        
    } catch (error) {
        console.error("Error while unlisting coupon",error);
        res.redirect("/admin/pageError")
    }
}



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