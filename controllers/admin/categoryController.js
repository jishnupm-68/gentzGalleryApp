const Category  = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const categoryInfo = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = 4 ;
        const skip = (page-1)*limit;

        const categoryData = await Category.find()
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        .exec();

        const totalCategories  = await Category.countDocuments();
        
        const totalPages = Math.ceil(totalCategories/limit);
        
        console.log(totalCategories, totalPages);
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





const addCategory = async (req,res)=>{
    const {name,description} = req.body;
    console.log(req.body)

    try{
        const existCategory  = await Category.findOne({name: name});
        if(existCategory){
            return res.status(400).json({error:"Category already exist"})
        }
        const newCategory = new Category({
            name,
            description});
        await newCategory.save();
        return res.status(200).json({success:true, message:"Category added successfully"});
    }catch(error){
        console.error("Error while adding new category",error.message);
        res.status(500).json({error:"An error occured"})
    }

}



const addCategoryOffer = async (req,res)=>{
    try{
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        const category = await Category.findById(categoryId);
        if(!category){
            return res.status(404).json({status:false, message:"Category not Found"});
        }
        const products =await Product.find({category:category._id});
        const hasProductOffer = products.some((product)=>{
            product.productOffer > percentage
        });
        if(hasProductOffer){
            return res.json({status:false, message:"Products within this category already have product offer"});

        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

        for(let product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }
        res.json({status:true})

    }catch(error){

        res.status(500).json({status:false,message:"Internal Server error"})
    }
}

const removeCategoryOffer = async (req,res)=>{
    try{
        const categoryId = req.body.categoryId;
        console.log(categoryId)
        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false, message:"Category not Found"});
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id});
        if(products.length>0){
            for(let product of products){
                product.salePrice += Math.floor(product.regularPrice *(percentage/100));
                product.productOffer = 0;
                await product.save();
        }       
    }
    category.categoryOffer = 0;
    await category.save();
    res.json({status:true})
}
    catch(error){
        res.status(500).json({status:false,message:"Internal Server error"})

    }
}



const getListCategory =async(req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/admin/pageError")
        
    }

}



const getUnListCategory = async(req,res)=>{
    try {
        const id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}



const getEditCategory = async(req,res)=>{
    try{
        const id  = req.query.id;
        const category = await Category.findById({_id:id});
        res.render('editCategory',{category:category})

    }catch(error){
        res.redirect("/admin/pageError");
    }


}



const editCategory = async (req,res)=>{
    try{
        const id = req.params.id;
    const {categoryName,description} = req.body;
    const category = await Category.findById({_id:id});
    const existingCategory = await Category.findOne({name:categoryName});
    if(existingCategory){
        return res.render('editCategory',{category:category, message:"Category name already exists"})
        //return res.status(400).json({error:"Category name already exists"})
    } 
    //res.redirect("/admin/category");

    const updateCategory = await Category.findByIdAndUpdate({_id:id},
        {name:categoryName,description:description},
        {new:true});
        if(updateCategory){
        res.redirect('/admin/category');            
        }else{
            res.status(400).json({error:"Category not updated"})
        }
    }catch(error){
        res.status(500).json({error:"Error updating category"})
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory
}