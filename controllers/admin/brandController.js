const Brand = require("../../models/brandSchema");
const product = require("../../models/productSchema");



const getBrandPage =async(req, res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =4;
        const skip = (page - 1) * limit;
        const brandData = await Brand.find().sort({createdAt:-1}).skip(skip).limit(limit);
       
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);
        const reverseBrand =brandData.reverse();
        console.log("brand is:",brandData,"reverse brand is: ", reverseBrand)
        res.render("brand", {
            data: reverseBrand,
            currentPage: page,
            totalPages:totalPages,
            totalBrands:totalBrands,
        });
        
    } catch (error) {
        console.log("error while fetching the brand page",error)
        res.redirect("/admin/pageError")
    }
}


// const addBrand = async(req, res)=>{
//     try{
//         const brand = req.body.name;
//         const findBrand= await Brand.findOne({brand});
//         if(!findBrand){
//             const image = req.file.filename;
//             const newBrand = new Brand({
//                 brandName:brand,
//                 brandImage:image
//             });
//             await newBrand.save();
//             res.redirect("/admin/brands");
//         }

//     }catch(error){
//         res.rediret("admin/pageError")

//     }
// }




const addBrand = async (req, res) => {
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({ brandName: brand });

        if (!findBrand) {
            console.log(req.file, req.file.filename, "File and filename")
            if (req.file && req.file.filename) {
                const image = req.file.filename;
                const newBrand = new Brand({
                    brandName: brand,
                    brandImage: image,
                });
                console.log(newBrand,image, "New image file creation")
                await newBrand.save();
                res.redirect("/admin/brands");
            } else {
                res.status(400).send("Image upload failed");
            }
        } else {
            res.status(400).send("Brand already exists");
        }
    } catch (error) {
        console.error("Error adding brand:", error);
        res.redirect("/admin/pageError");
    }
};

  


const blockBrand = async(req,res)=>{
    try{
        const id = req.query.id;
        await Brand.findByIdAndUpdate(id,{$set:{isBlocked:true}});
        res.redirect("/admin/brands");

    }catch(error){
        console.error("Error while blocking",error);
        res.status(500).redirect("/admin/pageError");

    }
}


const unBlockBrand = async(req,res)=>{
    try{
        const id = req.query.id;
        await Brand.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        res.redirect("/admin/brands");

    }catch(error){
        console.error("Error while unblocking",error);
        res.status(500).redirect("/admin/pageError");

    }
}



const deleteBrand = async(req,res)=>{
    try{
        const id = req.query.id;
        await Brand.findByIdAndDelete(id);
        res.redirect("/admin/brands");

    }catch(error){
        console.error("Error while deleting",error)
        res.status(500).redirect("/admin/pageError");

    }
}




module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}