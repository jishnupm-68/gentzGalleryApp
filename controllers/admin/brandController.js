const Brand = require("../../models/brandSchema");  // importing the brand schema
const cloudinary = require("../../config/cloudinary"); // Import  Cloudinary config
//rendering the brand page
const getBrandPage =async(req, res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =4;
        const skip = (page - 1) * limit;
        const [brandData, totalBrands] = await Promise.all([ 
            Brand.find().sort({createdAt:-1}).skip(skip).limit(limit),    
            Brand.countDocuments()
        ]);
        const totalPages = Math.ceil(totalBrands / limit);
        const reverseBrand =brandData.reverse();
        console.log("brand data page is rendered")
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

// adding new brand
const addBrand = async (req, res) => {
  try {
    const brand = req.body.name;
    const findBrand = await Brand.findOne({ brandName: brand });
    if (!findBrand) {
      if (req.file) {
        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "gentz_gallery_brands", // Folder in Cloudinary
        });

        const newBrand = new Brand({
          brandName: brand,
          brandImage: result.secure_url, 
        });

        // Save the brand to the database
        await newBrand.save();
        console.log("Brand added successfully");
        res.status(200).json({ success: true, message: "Brand successfully added" });
      } else {
        console.log("No image uploaded");
        res.status(400).json({ success: false, message: "Image upload failed" });
      }
    } else {
      console.log("Brand already exists");
      res.status(400).json({ success: false, message: "Brand already exists" });
    }
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ success: false, message: "Error adding brand" });
  }
};

// function for blocking the brand
const blockBrand = async(req,res)=>{
    try{
        const id = req.query.id;
        let result = await Brand.findByIdAndUpdate(id,{$set:{isBlocked:true}});
        if(result){
            res.status(200).json({success:true,message:`Brand  blocked successfully`});
            console.log("Brand blocked successfully")
        }else{
            res.json({success:false,message:`Brand  already blocked`});
            console.log("Brand already blocked")
        }
    }catch(error){
        console.error("Error while blocking",error);
        res.status(400).json({success:false, message:"Failed to block "});
    }
}

// function for unblocking the brand
const unBlockBrand = async(req,res)=>{
    try{
        const id = req.query.id;
        const result = await Brand.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        if(result){
            console.log("Brand unblocked successfully")
            res.status(200).json({success:true,message:`Brand  unblocked successfully`});
        }else{
            console.log("Brand already unblocked")
            res.status(200).json({success:false,message:`Brand  already unblocked`});
        }   
    }catch(error){
        console.error("Error while unblocking",error);
        res.status(500).json({success:false, message:"Failed to unblock"})
    }
}

// function for deleting the brand
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

//exporting functions
module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}