const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Address =  require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");
const env = require('dotenv').config();
const Razorpay  = require('razorpay');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require("path");
const payment = require('../../helpers/payment')



const decrementSaleCounts = async (cartItemQuantities) => {
    try {
      const bulkOperations = cartItemQuantities.map(item => ({
        updateOne: {
          filter: { _id: item.productId }, 
          update: { $inc: { saleCount: item.quantity , quantity: -item.quantity } },         
        },
      }));
      const result = await Product.bulkWrite(bulkOperations);
      console.log('Bulk decrement result:', result);
      return result;
    } catch (error) {
      console.error('Error decrementing sale counts:', error);
      throw error;
    }
  };

const getOrderDetailsPage = async (req,res)=>{
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        //const addressId = req.session.addressId;
        const addressId  = await Order.findOne({_id:orderId},{address:1,_id:0});
        const aId= addressId.address
        console.log("addressId",addressId.address,aId)
        const [addressData,findOrder,findUser]= await Promise.all ([
            Address.findOne({"address._id":aId}),
            Order.findOne({_id:orderId, userId:userId}),
            User.findOne({_id:userId}),
        ]);
        const address =  addressData.address.find(addr =>addr._id.toString()===aId.toString());
        let grandTotal = findOrder.finalAmount;
        let discount = findOrder.discount;
        let totalPrice = findOrder.totalPrice;
        console.log("FindOrdeR:",findOrder,address);
        res.render("orderDetails",{
            orders: findOrder,
            user: findUser,
            totalGrand: totalPrice,
            grandTotal: grandTotal,
            discount: discount,
            finalAmount : totalPrice,
            address:address,
        })
        console.log(req.session,req.body, req.params,req.query)  
    } catch (error) {
        console.error("error while loading the order details page", error)
        res.redirect('/pageNotFound')   
    }
}

const cancelOrder = async(req,res)=>{
    try {
        let findOrder;
        console.log(req.body, req.body.productId, req.session.user);
        const {productId, orderId, payment}= req.body;
        const userId = req.session.user;
        if(payment!="cod"){
             findOrder = await Order.findOneAndUpdate(
                {"orderedItems.product":productId, userId:userId, _id:orderId, status:"Verified"},
                {"orderedItems.$.productStatus":"Cancelled",
                "orderedItems.$.refundDate":Date.now()
                },
                {new:true}
            )
            let amount = findOrder.finalAmount
        await User.findByIdAndUpdate(
            {_id:userId},
            {$inc:{wallet:amount}}
        )
        }else{
             findOrder = await Order.findOneAndUpdate(
                {"orderedItems.product":productId, userId:userId, _id:orderId},
                {"orderedItems.$.productStatus":"Cancelled"},
                {new:true}
            )
        }       
        const cancelOrder = await Order.findOne(
            {"orderedItems.product":productId, userId:userId, _id:orderId},
            {"orderedItems.$":1},
        )       
        const cancelItemQuantities = cancelOrder.orderedItems.map((item)=>
            ({
                productId:item.product,
                quantity: -item.quantity
            })
            );
            console.log("findCancelled order","cancelItemQuantities",cancelItemQuantities)
            if(findOrder){
                let walletUpdate;
                if(findOrder.payment !== "cod"){
                    const quantity = findOrder.orderedItems[0].quantity;
                    const price =  findOrder.orderedItems[0].price;
                    let amount =  price * quantity;
                    walletUpdate = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet: amount } });
                    if (walletUpdate) {
                        console.log("Wallet updated successfully");
                    }else{
                        console.log("Wallet update failed");
                    }
                }
                decrementSaleCounts(cancelItemQuantities)
                  .then(result =>                     
                    {console.log('Decrement successful:', result)
                    if (result.modifiedCount === 1 && walletUpdate) {
                        return res.json({
                            success: true,
                            result, 
                            message: "Order has been successfully cancelled and amount credited to your wallet"
                        });
                    } else {
                        return res.json({
                            success: false,
                            result,
                            message: "Order cancellation failed. No changes made."
                        });
                    }}
                    )
                  .catch(error => console.error('Decrement failed:', error)); 
                console.log("findorder.payment", findOrder.payment )              
            }       
    } catch (error) {
        console.error("Error while cancelling the order",error);
        res.redirect('/pageNotFound')
    }
}

const returnrequestOrder = async(req,res)=>{
    try {
        const userId = req.session.user;
        const {productId, orderId} = req.body;
        const findOrder = await Order.findOneAndUpdate(
            {"orderedItems.product":productId, userId:userId, _id:orderId},
            {"orderedItems.$.productStatus":"Return Request",
            },
            {new:true}
        )
        const returnOrder = await Order.findOne(
            {"orderedItems.product":productId, userId:userId, _id:orderId},
            {"orderedItems.$":1},
        )    
        if(returnOrder){
            console.log("Return request successfull")
            res.json({
                success: true,
                message: "Return request has been sent successfully"
            });
        }else{
            console.log("Return request failed")
            res.json({
                success: false,
                message: "Return request failed. Please try again later"
            });
        }  
        // const returnItemQuantities = returnOrder.orderedItems.map((item)=>
        //     ({
        //         productId:item.product,
        //         quantity: -item.quantity
        //     })
        //     );
        //     console.log("findCancelled order",findOrder,"returned order",returnOrder,"cancelItemQuantities",returnItemQuantities)
           
            
            // if(findOrder){
            //     let walletUpdate;
            //     //updating wallet
            //     {
            //         //const quantity = findOrder.orderedItems[0].quantity;
            //         //const price =  findOrder.orderedItems[0].price;
            //         //let amount =  price * quantity;
            //         let amount =  findOrder.finalAmount
            //         walletUpdate = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet: amount } });
            //         if (walletUpdate) {
            //             console.log("Wallet updated successfully");
            //         }else{
            //             console.log("Wallet update failed");
            //         }
            //     }
            //     decrementSaleCounts(returnItemQuantities)
            //       .then(result =>                     
            //         {console.log('Decrement successful:', result)
            //         if (result.modifiedCount === 1 && walletUpdate) {
            //             return res.json({
            //                 success: true,
            //                 result, 
            //                 message: "Order has been successfully cancelled and amount credited to your wallet"
            //             });
            //         } else {
            //             return res.json({
            //                 success: false,
            //                 result,
            //                 message: "Order cancellation failed. No changes made."
            //             });
            //         }}
            //         )
            //       .catch(error => console.error('Decrement failed:', error));                         
            // }      

    } catch (error) {
        console.log("Error while creating the return request",error);
        res.json({success:false, message:"An error occured while creating the return request"});      
    }
}

const downloadInvoice = async (req, res) => {
try {
    const userId = req.session.user;
    const orderId = req.query.id;

    // Fetching address ID from order
    const order = await Order.findOne({ _id: orderId, userId: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const aId = order.address;
    const [addressData, findUser] = await Promise.all([
      Address.findOne({ "address._id": aId }),
      User.findOne({ _id: userId }),
    ]);

    if (!addressData || !findUser) {
      return res.status(404).json({ success: false, message: "User or Address not found" });
    }

    const address = addressData.address.find((addr) => addr._id.toString() === aId.toString());
    if (!address) {
      return res.status(404).json({ success: false, message: "Address details not found" });
    }

    // Creating PDF document
    const doc = new PDFDocument();
    let chunks = [];
    let result;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${orderId}.pdf`);
      res.send(result);
    });
    doc.registerFont("NotoSans", path.join(__dirname, "../../public/assets/fonts", "NotoSans-Regular.ttf"));
    doc.font("NotoSans");

    // Invoice Title
    doc.fontSize(22).text("Invoice: GentzGallery", { align: "center", underline: true });

    doc.moveDown(2);

    // Order Information
    doc.fontSize(16).text("Order Information", { align: "left", underline: true });
    doc.fontSize(12).text(`Order Date: ${new Date(order.createdOn).toLocaleDateString()}`);
    doc.fontSize(12).text(`Payment Method: ${order.payment}`);
    doc.fontSize(12).text(`Payment Status: ${order.status}`);
    let shipping;
    req.session.subtotal>1000?shipping="Free":shipping="₹50 included";
    doc.fontSize(12).text(`Total Price: ₹ ${order.totalPrice}`);
    doc.fontSize(12).text(`Shipping: ${shipping} `);
    doc.fontSize(12).text(`Total Discount: ₹${order.discount}`);
    doc.fontSize(12).text(`Final Amount: ₹${order.finalAmount}`);
    
    doc.moveDown();

    // Product Details
    doc.fontSize(16).text("Product Details", { underline: true });
    order.orderedItems.forEach((item, index) => {
      doc.moveDown(0.5);
      doc.fontSize(12).text(`${index + 1}. Product Name: ${item.productName}`);
      doc.fontSize(12).text(`   Quantity: ${item.quantity}`);
      doc.fontSize(12).text(`   Price: ₹ ${item.price}`);
    });

    doc.moveDown(2);

    // Delivery Information
    doc.fontSize(16).text("Delivery Information", { underline: true });
    doc.fontSize(12).text(`Name: ${address.name}`);
    doc.fontSize(12).text(`Address Type: ${address.addressType}`);
    doc.fontSize(12).text(`Landmark: ${address.landMark}`);
    doc.fontSize(12).text(`City: ${address.city}`);
    doc.fontSize(12).text(`State: ${address.state}`);
    doc.fontSize(12).text(`Pincode: ${address.pinCode}`);
    doc.fontSize(12).text(`Phone: ${address.phone}`);

    doc.end();
    console.log("Invoice PDF generated successfully");

  } catch (error) {
    console.error("Error while generating the invoice:", error);
    res.status(500).json({ success: false, message: "An error occurred while generating the invoice" });
  }
};

const retryPayment = async(req,res)=>{
    try {
        const {orderId} = req.body;
        const [findUser,orderDone] = await Promise.all([
            User.findOne({_id:req.session.user}),
            Order.findOne({_id:orderId})
            
        ])
        
        console.log("Orderid,body", orderId,req.body)
        payment.generateRazorpay(orderDone._id,orderDone.finalAmount,(err,order)=>{
            if(err){
                console.log("error whil creating the razorpay payment",err)
            }else{
                console.log("order placed now for razorpay",order)
                
                req.session.orderId = order.id
                res.json({
                    payment: true,
                    method: "razorpay",
                    order: orderDone,
                    orderId: order.id,
                    user:findUser,
                });
            }
        });   
        
    } catch (error) {
        console.log("Erro while retrying the payment", error);
        res.json({success:false, message:"An error occured while retrying the payment"});
        
    }
}

module.exports = {
    getOrderDetailsPage,
    cancelOrder,
    returnrequestOrder,
    downloadInvoice,
    retryPayment,
    
}



