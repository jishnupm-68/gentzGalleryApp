
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const session = require("express-session");

//function for rendering the add address page
const loadAddAddress = async(req,res)=>{
    try{
        const user = await User.findOne({_id:req.session.user});
        console.log("Rendering the add address page")
        res.render('addAddress',{user:user})
    }catch(error){
        console.error("error while rendering the add address page",error)
        res.redirect('/pageNotFound')
    }
}

//function for adding a new address to the user's profile
const postAddAddress = async (req,res)=>{
    try { 
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType, name, city, landMark, state, pincode,phone, altPhone} = req.body
        const userAddress = await Address.findOne({userId:userId});
        if(!userAddress){
            const newAddress = new Address({
                userId:userId,
                address: [{
                addressType,
                name,
                city,
                landMark,
                state,
                pinCode:pincode,
                phone,
                altPhone}]
            })
            await newAddress.save();
            res.json({success:true, message:"Address added successfully", redirectUrl:"/userProfile"})
            console.log("address added successfully")
        }else{           
            userAddress.address.push({addressType, name, city, landMark, state, pinCode:pincode,phone, altPhone});
            await userAddress.save();
            res.json({success:true, message:"Address added successfully",redirectUrl:'/userProfile'})
            console.log("address updated successfully")
        }
    } catch (error) {
        console.error("error while adding the address", error)
        res.json({success:false, message:"Error while addding new address",redirectUrl:'/userProfile'})
    }
}

//function for rendering the edit address page  
const loadEditAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const [user,currentAddress] = await Promise.all([
            User.findOne({_id:req.session.user}),
            Address.findOne({"address._id":addressId})
        ]);
        if(!currentAddress){
            console.error("The  address is not found");
            return res.redirect('/pageNotFound');
        }
        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString();
        })
        if(!addressData){
            console.error("The address details are not found");
            return res.redirect('/pageNotFound');
        }
        console.log("Rendering the edit address page")
        res.render('editAddress',{user:user, address:addressData})
    } catch (error) {
        console.error("error while rendering the edit address page", error)
        res.redirect('/pageNotFound')      
    }
}

//edit and update address
const editAddress = async(req,res)=>{
    try {
        const data = req.body;
        const addressId = req.query.id;
        const user= req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            console.error("The address is not found",req.query, findAddress);
            return res.json({success:false, message: "The address is not found"});
        }
        await Address.updateOne(
            {"address._id":addressId},
            {
                $set :{
                    "address.$":{
                        _id:addressId,
                        addressType:data.addressType,
                        name:data.name,
                        city:data.city,
                        landMark:data.landMark,
                        state:data.state,
                        pinCode:data.pincode,
                        phone:data.phone,
                        altPhone:data.altPhone,
                        updatedAt: new Date()
                    }
                }
            }
        )
        console.log("The address updated successfully")
        res.json({success:true, message:"Address updated successfully", redirectUrl:"/userProfile"})
    } catch (error) {
        console.error("error while editing the address", error)
        res.json({success:false, message:"Error while updating the address", redirectUrl:"/userProfile"});   
    }
}

//function for deleting the address
const deleteAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const user= req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            console.error("The address is not found");
            return res.json({success:false, message: "The address is not found"})
        }
        await Address.updateOne({"address._id":addressId},{$pull:{address: {_id:addressId}}})
        res.json({success:true, message:"Address deleted successfully", redirectUrl:"/userProfile"})      
    } catch (error) {
        console.error("error while deleting address", error);
        res.json({success:false, message:"Error while deleting address"})
    }
}

//exporting modules
module.exports = {
    loadAddAddress,
    postAddAddress,
    loadEditAddress,
    editAddress,
    deleteAddress
}