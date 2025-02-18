const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");

//load the cart page with cart items
const getCartPage = async(req,res)=>{
    try {
      let deliveryCharge = 0;
        const userId = req.session.user; 
        
        const [user,cart] = await Promise.all([
          User.findOne({ _id: userId }), 
          Cart.findOne({ userId }).populate("items.productid")]);

        if (!cart || cart.items.length === 0) {
            return res.render("cart", { user: user, items: [], grandTotal: 0 });
        } 
        const cartItems = cart.items.map((item) => {
            const product = item.productid;
            let price = product.offerPrice>0?product.offerPrice:product.salePrice;
            return {
                name: product.productName,
                salePrice:product.salePrice,
                price: price,
                brand:product.brand,
                category: product.category,
                stock: product.quantity,
                quantity: item.quantity,
                totalSalePrice: product.salePrice*item.quantity,
                total: price * item.quantity,
                image: product.productImage[0],
                productId: product._id,
            };
        });

        let grandTotal = cartItems.reduce((total, item) => total + item.total, 0);

        let subtotal = (cartItems.reduce((totalSalePrice,item) => totalSalePrice + item.totalSalePrice,0));
        
       subtotal>0?subtotal:0;
       subtotal>1000?deliveryCharge=0:deliveryCharge=50;
       
        let discountDecimal = subtotal-grandTotal;
        let discount = discountDecimal.toFixed(2);
        grandTotal+=deliveryCharge;
        req.session.discount = discount;
        req.session.grandTotal = grandTotal;
        req.session.subtotal = subtotal;
        console.log("cartItems",cartItems,"grandTotal",grandTotal,req.session.user);
        res.render("cart", {
            user: user, 
            items: cartItems,
            grandTotal:grandTotal,
            subtotal:subtotal,
            discount:discount,
            deliveryCharge:deliveryCharge,
        });
}
     catch (error) {
        console.error("error while rendering the cart page",error);
        res.redirect('/pageNotFound')    
    }
}

const addToCart = async (req, res) => {
    try {
        console.log("body",req.body)
      const userId = req.session.user;
      let { productId,price,quantity } = req.body; 
      quantity = Number(quantity)
      const productid = productId; 

      if (!mongoose.Types.ObjectId.isValid(productid)) {
        return res.status(400).send({ message: "Invalid product ID" });
      }

      const totalPrice = Number(quantity) * price;
      let userCart = await Cart.findOne({ userId });

      if (!userCart) {
        userCart = new Cart({
          userId,
          items: [
            {
              productid,
              quantity,
              price,
              totalPrice,
            },
          ],
        });
      } else {
        const productIndex = userCart.items.findIndex(
          (item) => item.productid.toString() === productid
        );
        if (productIndex >= 0) {
          userCart.items[productIndex].quantity += Number(quantity);
          userCart.items[productIndex].totalPrice += totalPrice;
        } else {
          userCart.items.push({
            productid,
            quantity,
            price,
            totalPrice,
          });
        }
      }
      await userCart.save();
      const user = await User.findById(userId);
      if (!user.cart.includes(userCart._id)) {
        user.cart.push(userCart._id);
        await user.save();
      }
      req.session.grandTotal  =  totalPrice;
      console.log("Cart updated, new product added")
      res.redirect('/cart')
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.redirect('/pageNotFound')
    }
  };
  
const deleteItem = async(req,res)=>{
    try {
        const productToDeleteId = req.query.id;  
        console.log('Item ID:', productToDeleteId);
        const userId = req.session.user;  
        const updatedCart = await Cart.findOneAndUpdate(
            {userId:userId}, 
            {
                $pull:{
                    items: {productid: new mongoose.Types.ObjectId(productToDeleteId)}
                }
            },
            {new:true}
    )
    if(!updatedCart){
        console.log("error while deleting")
        return res.redirect("/pageNotFound")}
        else{
            console.log("product deleted successfully")
            res.redirect("/cart")
        }        
    } catch (error) {
        console.error("unable to delete the product from cart",error);
        res.redirect("/pageNotFound")    
    }
}
  
const changeQuantity =async (req,res)=>{
    try {
      let deliveryCharge = 0;
        let { productId, quantity, count } = req.body;
        console.log(productId,quantity, count)
        let newQuantity = parseInt(quantity) + parseInt(count);   
        newQuantity <= 1?newQuantity=1:newQuantity;
        newQuantity>=5?newQuantity=5:newQuantity;
        const updatedCart = await Cart.findOneAndUpdate(
            { 'items.productid': productId },
            { $set: { 'items.$.quantity': newQuantity } }, 
            { new: true } 
        ).populate("items.productid");
        if (!updatedCart) {
            console.log("error while changing quantity")
            return res.redirect('/pageNotFound')
        }

        const cartItems = updatedCart.items.map((item) => {
          const product = item.productid;
          let price = product.offerPrice>0?product.offerPrice:product.salePrice;
          return {
              total: price * item.quantity,              
          };
      });
       
        
        console.log("updatedCart", updatedCart, cartItems);
      
        let subtotal = updatedCart.items.reduce(
            (total, item) => total + item.quantity * item.price,
            0
        );
        grandTotal  =  cartItems.reduce((acc,obj)=>acc+obj.total,0);
       
        
       subtotal>0?subtotal:0;
       subtotal>1000?deliveryCharge=0:deliveryCharge=50;
        let discountDecimal = subtotal-grandTotal;
        let discount = Number(discountDecimal.toFixed(2));
        grandTotal+=deliveryCharge;
        req.session.discount = discount;
        req.session.grandTotal = grandTotal;
        req.session.subtotal = subtotal;
        console.error("cart quantity changed successfully","grandTotal", grandTotal, "subtotal",subtotal,"discount", discount, "deliveryCharge", deliveryCharge)
        res.json({ success: true, grandTotal, subtotal, discount, deliveryCharge });
        //res.redirect('/cart')    
    } catch (error) {
        console.error("error while changing quantity", error);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    getCartPage,
    addToCart,
    deleteItem,
    changeQuantity
}