const Product = require('../../models/productSchema')

// render the stock page and perform the search 
const getStockPage = async (req,res)=>{
    try {
        const search = req.query.search || "";
        let query = {
            isBlocked: false,
            $or: [
                { productName: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } }
            ]
        };
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let skipCount = (currentPage - 1) * itemsPerPage;
        const [totalProducts, currentProducts] = await Promise.all([
            Product.countDocuments(query), 
            Product.find(query) 
                .skip(skipCount)
                .limit(itemsPerPage)
                .lean()
        ]);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);  
        console.log("Stock page loaded")
        res.render("stock", {products:currentProducts, currentPage:currentPage, totalPages:totalPages});  
    }
    catch (error) {
        console.error("error while loading the stock page", error)
        res.redirect('/admin/pageError')  
    }
}

// update the stock quantity in the database
const addQuantity = async (req,res)=>{
    try {
        console.log(req.body)
        const { quantity, productId } = req.body;
        let result = await Product.updateOne({_id: productId},{$inc:{quantity:quantity}});
        if(result.modifiedCount === 0){
            console.log("Product not found")
            return res.json({ status: false, message: "Product not found or unable to update" });
        }else{
            console.log("Product updated successfully")
            return res.json({ status: true, message: "Product updated successfully" });
        }
    } catch (error) {
        console.error("Error while adding quantity", error);
        res.status(500).redirect("/admin/pageError");   
    }
}

//exporting the functions
module.exports = {
    getStockPage,
    addQuantity
}
