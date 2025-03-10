const Order = require("../../models/orderSchema");     // importing the order schema
const User = require("../../models/userSchema");       // importing the user schema
const Address = require('../../models/addressSchema'); // importing the address schema
const Product = require('../../models/productSchema'); // importing the product schema

//function for changing the quantity as per the operation either increase or decrease according to the order status
const decrementSaleCounts = async (cartItemQuantities) => {
    try {
      const bulkOperations = cartItemQuantities.map(item => ({
        updateOne: {
          filter: { _id: item.productId }, 
          update: { $inc: { saleCount: -item.quantity , quantity: item.quantity } }, 
        },
      }));
      const result = await Product.bulkWrite(bulkOperations);
      console.log('Bulk decrement occured');
      return result;
    } catch (error) {
      console.error('Error decrementing sale counts:', error);
      throw error;
    }
};

//function for rendering the order list page
const loadOrders = async (req,res)=>{
    try { 
        const itemsPerPage = 3;
        const currentPage = parseInt(req.query.page) || 1;
        const skipItems = (currentPage - 1) * itemsPerPage;
        const [orders, totalOrders] = await Promise.all([
            Order.find({})
                .sort({ createdOn: -1 })
                .skip(skipItems)  
                .limit(itemsPerPage)  
                .lean(),  
            Order.countDocuments()
        ]);
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        console.log("rendering the order list page")
        res.render("orderList", {orders:orders, currentPage:currentPage, totalPages:totalPages});       
    } catch (error) {
        console.error("error while rendering the order deatails page",error);
        res.redirect("/admin/pageError");
    }
}

//function for changing the order status
const updateOrderStatus = async (req,res)=>{
    try {
        console.log(req.body)
        const {orderId, productId, status} = req.body;
        let update = await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
            {$set:{"orderedItems.$.productStatus":status}},
            {new:true});    
        if(update.status =="Pending" && update.payment == "cod"){
            await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
                {$set:{status:"Verified"}},
                {new:true});
        }
        if(status=="Cancelled")
            { 
                if(update.payment !== "cod"){
                    const quantity = update.orderedItems[0].quantity;
                    const price =  update.orderedItems[0].price;
                    let amount =  price * quantity;
                    walletUpdate = await User.findOneAndUpdate(
                        { _id: update.userId },
                        { $inc: { wallet: amount } }
                    );
                    if (walletUpdate) {
                        console.log("Wallet updated successfully");
                    }else{
                        console.log("Wallet update failed");
                    }
                }
                  const items = update.orderedItems.map((item)=>
                ({ 
                    productId:item.product,
                    quantity: item.quantity
                })
                );   
                decrementSaleCounts(items)
                .then(result => console.log('Decrement successful:'))
                .catch(error => console.error('Decrement failed:'));             
        }
        console.log("Updating the order")
        res.json({ status: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error while updating order status", error);
        res.json({ status: false, message: "Failed to update order status" });
    }
}

//function for updating the return status and handling the payment
const updateReturnStatus = async (req,res)=>{
    try {
        const {orderId, productId, status} = req.body;
        let actualStatus = status==true?"Returned":"Return Request";
        let message = status == true ? "Return request accepted" : "Return request rejected";
        let date = status == true ? (new Date()).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) : null;
        let update = await Order.findOneAndUpdate({_id:orderId, "orderedItems.product":productId},
            {$set:
                {
                    "orderedItems.$.productStatus":actualStatus,
                    "orderedItems.$.returnStatus":message,
                    "orderedItems.$.refundDate":date}},
            {new:true});
         const returnItemQuantities = update.orderedItems.map((item)=>
            ({
                productId:item.product,
                quantity: item.quantity
            })
            );
            if(update && status == true){
                let walletUpdate;
                {
                    let amount =  update.finalAmount
                    walletUpdate = await User.findOneAndUpdate({ _id: update.userId },
                         { 
                            $inc: { wallet: amount },
                            $push: {
                                walletHistory: {
                                    transactionDate: (new Date()).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
                                    transactionAmount: amount,
                                    transactionType: "Credit",
                                }
                            }
                         });
                    if (walletUpdate) {
                        console.log("Wallet updated successfully");
                    }else{
                        console.log("Wallet update failed");
                    }
                }
                decrementSaleCounts(returnItemQuantities)
                  .then(result =>                     
                    {console.log('Decrement successful:')
                    if (result.modifiedCount === 1 && walletUpdate) {
                        console.log("Order has been successfully cancelled and amount credited to your wallet");
                        return res.json({
                            success: true,
                            result, 
                            message: "Order has been successfully cancelled and amount credited to your wallet"
                        });
                    } else {
                        console.log("Order cancellation failed. No changes made.");
                        return res.json({
                            success: false,
                            result,
                            message: "Order cancellation failed. No changes made."
                        });
                    }}
                    )
                  .catch(error => console.error('Decrement failed:', error));                         
            }    
        console.log("Updating the return status")  
        res.json({ status: true, message: "Return status updated successfully" });       
    } catch (error) {
        console.error("Error while updating return status", error);
        res.json({ status: false, message: "Failed to update return status" });       
    }
}

//functoin for rendering the order details page in the admin side
const getOrderDetailsPageAdmin = async (req,res)=>{
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        const [addressId, findOrder, findUser]    = await Promise.all([ 
            Order.findOne({_id:orderId},{address:1,_id:0}),
            Order.findOne({_id:orderId}),
            User.findOne({_id:userId})
        ]);
        const aId= addressId.address      
        const addressData = await Address.findOne({"address._id":aId});    
        const address =  addressData.address.find(addr =>addr._id.toString()===aId.toString());
        let grandTotal = findOrder.finalAmount;
        let discount = findOrder.discount;
        let totalPrice = findOrder.totalPrice;
        console.log("Order details page in the admin side successfully rendered")
        res.render("orderDetailsAdmin",{
            orders: findOrder,
            user: findUser,
            totalGrand: totalPrice,
            grandTotal: grandTotal,
            discount: discount,
            finalAmount : totalPrice,
            address:address,
        })
    } catch (error) {
        console.error("error while loading the order details page", error)
        res.redirect('/admin/pageError')     
    }
}

//exporting the modules
module.exports = {
    loadOrders,
    updateOrderStatus,
    getOrderDetailsPageAdmin,
    updateReturnStatus
}

