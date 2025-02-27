const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

//render the product add page
const getProductAddPage = async (req, res) => {
  try {
    const [category, brand] = await Promise.all([
      Category.find({ isListed: true }),
      Brand.find({ isBlocked: false }),
    ]);
    console.log("Render the product add page")
    res.render("addProduct", { cat: category, brand: brand });
  } catch (error) {
    console.log("Error in getProductAddPage", error);
    res.redirect("/admin/pageError");
  }
};

//add new product to the database
const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productExists = await Product.findOne({
      productName: products.productName.trim(),
    });
    if (!productExists) {
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join(
            __dirname,
            "../../public/uploads/product-imagesResized",
            req.files[i].filename 
          );
          await sharp(originalImagePath)
            .resize({ width: 440, height: 400 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);        
        }
      }
      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        return res.status(400).join({ message: "Category not found" });
      }
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        quantity: products.quantity,
        size: products.size,
        color: products.color,
        productImage: images,
        status: "Available",
      });
      await newProduct.save();
      console.log("New product saved successfully");
      return res.json({ success:true,message:"Product successfully Added" ,redirectUrl:"/admin/addProducts"});
    } else {
      const [category, brand] = await Promise.all([
         Category.find({ isListed: true }),
         Brand.find({ isBlocked: false }),
      ]);
      console.log("Product name already exists, please try again with another name");
      return res.status(400).json({success:false, message: "Product already exists" });
    }
  } catch (error) {
    console.error("Error while saving the new product", error);
    return res.redirect("/admin/pageError");
  }
};

//render the all product page with search option
const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    const [productData, count, categories, brands] = await Promise.all([
      Product.find({
          $or: [
              { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
              { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
          ],
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .exec(),
      Product.countDocuments({
          $or: [
              { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
              { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
          ],
      }),
      Category.find({ isListed: true }),
      Brand.find({ isListed: true }) 
  ]);
    if (categories && brands) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: categories,
        brand: brands,
      });
      console.log("Render the all products page with search option")
    } else {
      console.log("Error in getAllProducts");
      res.render("adminError");
    }
  } catch (error) {
    console.log("Error in getAllProducts", error);
    res.redirect("/admin/pageError");
  }
};

//function for adding the product offer
const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });
    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "This product category already has a category offer",
      });
    }
    findProduct.offerPrice =
      findProduct.salePrice -
      Math.floor(findProduct.salePrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    console.log("Product offer added successfully");
    res.json({ status: true });
  } catch (error) {
    console.error("Error while adding the product offer", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

//function for removing the product offer
const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.productOffer = 0;
    findProduct.offerPrice =0;
    await findProduct.save();
    console.log("Product offer removed successfully");
    res.json({ status: true });
  } catch (error) {
    console.error("error while removing the productOffer",error)
    res.redirect("/admin/pageError");
  }
};

//function for block a product
const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.findByIdAndUpdate(id, { $set: { isBlocked: true } });
    console.log("Product blocked");
    return res.status(200).json({
      success: true,
      message: "Product blocked successfully",
    })
  } catch (error) {
    console.error("Error while blocking the product", error);
    return res.status(400).json({
      success: false,
      message: "Error while blocking the product",
    })
  }
};

//function for unblock a product
const unBlockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.findByIdAndUpdate(id, { $set: { isBlocked: false } });
    console.log("Product unblocked");
    return res.status(200).json({success: true, message: "Product unblocked successfully" });
  } catch (error) {
    console.error("Error while unblocking the product", error);
    return res.status(400).json({
      success: false,
      message: "Error while unblocking the product",
    });
  }
};

//function for render page for editing the product
const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const [product, category, brand] = await Promise.all([ 
      Product.findById({ _id: id }),
      Category.find({isListed:true}),
      Brand.find({})
    ]);
    const currentCategory = await Category.findOne({ _id: product.category });
    if (product && category && brand) {
      res.render("editProduct", {
        product: product,
        cat: category,
        brand: brand,
        currentCategory: currentCategory,
      });
      console.log("Rendered edit product page")
    } else {
      console.log("Error in getEditProduct page");
      res.render("/admin/pageError");
    }
  } catch (error) {
    console.log("Error in getEditProduct", error);
    res.redirect("/admin/pageError");
  }
};

//function for updating the product
const editProduct = async (req, res) => {
  console.log("editing the existing product");
  try {
    const id = req.query.id;
    const data = req.body;
    const [product, existingProduct, category, brand] = await Promise.all([
      Product.findOne({ _id: id }),
      Product.findOne({_id: {$ne: id},
        productName: data.productName.trim(),
      }),
      Category.find({isListed: true}),
      Brand.find({isBlocked: false}),
    ]);
    const currentCategory = await Category.findOne({ _id: product.category });
    if (existingProduct) {
      console.log("Product name already exists, please try again with another name");
      return res.json({ success:false, message: "Product name already exists, please try with another name" });
    }
    const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join(
            __dirname,
            "../../public/uploads/product-imagesResized",
            req.files[i].filename 
          );
          await sharp(originalImagePath)
            .resize({ width: 440, height: 400 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);
        }
      }
    const newCategoryId = await Category.findOne({name:data.category},{_id:1});
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: newCategoryId,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
      productImage: images,
    };
    if (req.files.length > 0) {
      updateFields.$push = {
        productImage: { $each: images },
      };
    }
    let result =  await Product.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    console.log("Data saved for editing the product"  );
    res.json({success:true, message:"Product updated successfully",redirectUrl:"/admin/products"});
  } catch (error) {
    console.error("Error in editProduct", error);
    res.redirect("/admin/pageError");
  }
};

//function for deleting a image in edit product page
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.resolve(
      __dirname,
      "../../public/uploads/brands",
      imageNameToServer
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log("Image  deleted successfully");
      res.json({ success: true, message: "Image deleted successfully"});
    } else {
      console.error("Image not found to delete", imageNameToServer);
      res.json({ success: false, message: "Image not found"});
    }
  } catch (error) {
    console.error("Error in deleteSingleImage", error);
    res.json({success:false, message: "Error while deleting the image" })
  }
};

//exporting the functions
module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unBlockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
