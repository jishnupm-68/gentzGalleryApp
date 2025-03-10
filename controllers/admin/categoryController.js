const Category  = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");

//render the category page with pagination
const categoryInfo = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = 4 ;
        const skip = (page-1)*limit;
        const [categoryData,totalCategories] = await Promise.all([ Category.find()
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit)
            .exec(),
        Category.countDocuments()
        ]);
        const totalPages = Math.ceil(totalCategories/limit);   
        console.log("rendering the category page")
        res.render('category',{
            cat:categoryData,
            currentPage:page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })
    }
    catch(error){
        console.error("Error while fetching category information",error.message);
        res.redirect('/admin/pageError');
    }
}

//render add category page
const getAddCategory = async (req,res)=>{
    try {
        res.render("addNewCategory")
        console.log("Rendering add new category page")    
    } catch (error) {
        console.error("Error while rendering the add new category page",error)
        res.redirect('/admin/pageError')
    }
}

//add new category to the database
const addCategory = async (req,res)=>{
    const {name,description} = req.body;
    try{
        const existCategory  = await Category.findOne({name: name.trim()});
        if(existCategory){
            console.log("Category already exists")
            return res.json({success:false, message:"Category already exist"})
        }
        const newCategory = new Category({
            name:name.trim(),
            description});
        await newCategory.save();
        console.log("Category added to database")
        return res.status(200).json({success:true, message:"Category added successfully"});
    }catch(error){
        console.error("Error while adding new category",error.message);
        res.json({success:false,  message:"An error occured"})
    }
}

//adding category offer
const addCategoryOffer = async (req,res)=>{
    try{
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if(!category){
            console.log("Category not found")
            return res.status(404).json({status:false, message:"Category not Found"});
        }
        const products =await Product.find({category:category._id});
        const hasProductOffer = products.some((product)=>{
            product.productOffer > percentage
        });
        if(hasProductOffer){
            console.log("Products within this category already have product offer")
            return res.json({status:false, message:"Products within this category already have product offer"});
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});
        for(let product of products){
            if (product.productOffer <percentage && percentage > 0) {
                let discountAmount = (product.salePrice * percentage) / 100;
                product.offerPrice = product.salePrice - discountAmount; // Apply discount
            } else {
                product.salePrice = product.salePrice; // No discount, keep regular price
            }
            await product.save();
        }
        console.log("Category offer added successfully")
        res.json({status:true, message:"Category offer added"})
    }catch(error){
        console.error("Error while adding category offer",error);
        res.status(500).json({status:false,message:"Internal Server error"})
    }
}

//remove category offer
const removeCategoryOffer = async (req,res)=>{
    try{
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if(!category){
            console.log("Category not found")
            return res.status(404).json({status:false, message:"Category not Found"});
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id});
        if(products.length>0){
            for(let product of products){
                product.productOffer = 0;
                product.offerPrice =0;
                await product.save();
        }       
    }
    category.categoryOffer = 0;
    await category.save();
    res.json({status:true})
    console.log("Category offer removed")
    }catch(error){
        res.status(500).json({status:false,message:"Internal Server error"})
        console.error("Error while removing category offer",error)
    }
}

//listing category
const getListCategory =async(req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Error while listing category",error);
        res.redirect("/admin/pageError")  
    }
}

//unlisting category
const getUnListCategory = async(req,res)=>{
    try {
        const id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Error while unlisting category",error);
        res.redirect("/admin/pageError")
    }
}

//edit category page
const getEditCategory = async(req,res)=>{
    try{
        const id  = req.query.id;
        const category = await Category.findById({_id:id});
        res.render('editCategory',{category:category});
        console.log("Rendering edit category page")
    }catch(error){
        console.error("Error while fetching category information",error);
        res.redirect("/admin/pageError");
    }
}

//edit category to the database  with validation check for duplicate category name  in the same category
const editCategory = async (req,res)=>{
    try{
        const id = req.params.id;
        const {categoryName,description} = req.body;
        const categoryId = new mongoose.Types.ObjectId(id); 
        const [category,existingCategory] = await Promise.all([ 
            Category.findById({_id:id}),           
        Category.findOne({ name: categoryName.trim(), _id: { $ne: categoryId } })
        ]);
        if(existingCategory){
            console.log("existing category")
           return res.json({ success:false, message:"Category already exists"}) 
        } 
        const updateCategory = await Category.findByIdAndUpdate({_id:id},
            {name:categoryName,description:description},
            {new:true});
        if(updateCategory){
            console.log("Category updated successfully")
            return res.json({success:true, message:"Category updated successfully"})  
        }else{
            console.log("Category not updated")  
           return res.status(400).json({success:false,message:"Category not updated"})
        }
    }catch(error){
        console.log("error while updating category",error)
        return res.status(500).json({error:"Error updating category"})
    }
}

//exporting funtions
module.exports = {
    categoryInfo,
    getAddCategory,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory
}