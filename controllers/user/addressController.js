
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require("../../models/orderSchema")
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require("express-session");



const loadAddAddress = async(req,res)=>{
    try{
        const user = req.session.user
        res.render('addAddress',{user:user})

    }catch(error){
        console.error("error while rendering the add address page",error)
        res.redirect('/pageNotFound')

    }
}


const postAddAddress = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType, name, city, landMark, state, pincode,phone, altPhone} = req.body
        console.log(req.body)
        const userAddress = await Address.findOne({userId:userId});
        console.log("condition checking",userAddress)
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
            res.redirect('/userProfile')
        }else{
              userAddress.address.push({addressType, name, city, landMark, state, pinCode:pincode,phone, altPhone});
              await userAddress.save();
              res.redirect('/userProfile')
        }
    } catch (error) {
        console.error("error while adding the address", error)
        res.redirect('/pageNotFound')
        
    }
}

const loadEditAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const currentAddress = await Address.findOne({
            "address._id":addressId,
        })
        if(!currentAddress){
            console.error("The  address is not found");
            return res.redirect('/pageNotFound');
        }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString();
        })
        
        if(!addressData){
            return res.redirect('/pageNotFound');
        }
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
        console.log("incoming data",data)
        const addressId = req.query.id;
        const user= req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            console.error("The address is not found",req.query, findAddress);
            return res.redirect('/pageNotFound');
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

        res.redirect('/userProfile');
        
    } catch (error) {
        console.error("error while editing the address", error)
        res.redirect('/pageNotFound')
        
    }
}

const deleteAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        console.error("AddressID",addressId)
        const user= req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            console.error("The address is not found");
            return res.redirect('/pageNotFound');
        }
        await Address.updateOne({"address._id":addressId},{$pull:{address: {_id:addressId}}})
        res.redirect('/userProfile');
        
    } catch (error) {
        console.error("error while deleting address", error);
        res.redirect('/pageNotFound')
    }
}



module.exports = {
    loadAddAddress,
    postAddAddress,
    loadEditAddress,
    editAddress,
    deleteAddress
}