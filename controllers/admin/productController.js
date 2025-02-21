const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const [category, brand] = await Promise.all([
      Category.find({ isListed: true }),
      Brand.find({ isBlocked: false }),
    ]);
    res.render("addProduct", { cat: category, brand: brand });
  } catch (error) {
    console.log("Error in getProductAddPage", error);
    res.redirect("/admin/pageError");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    console.log("coming data products", products, "files", req.files);
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
          console.log("debugging", originalImagePath, resizedImagePath);
          await sharp(originalImagePath)
            .resize({ width: 440, height: 400 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);
          console.log(
            "images",
            req.files[i].filename,
            "resizedPath",
            resizedImagePath
          );
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
      return res.redirect("/admin/addProducts");
    } else {
      const [category, brand] = await Promise.all([
         Category.find({ isListed: true }),
         Brand.find({ isBlocked: false }),
      ]);
      return res.render("addProduct", { cat: category, brand: brand,
      message: "Product name already exists, please try again with another name" });

      //return res.status(400).json({ message: "Product already exists" });
    }
  } catch (error) {
    console.error("Error while saving the new product", error);
    return res.redirect("/admin/pageError");
  }
};

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
    console.log(count, limit);
    if (categories && brands) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: categories,
        brand: brands,
      });
    } else {
      res.render("adminError");
    }
  } catch (error) {
    console.log("Error in getAllProducts", error);
    res.redirect("/admin/pageError");
  }
};

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
     // findProduct.salePrice = findProduct.offerPrice;
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    res.json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal Server Error" });
    //res.redirect("/admin/pageError");
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    //findProduct.salePrice =findProduct.salePrice +Math.floor(findProduct.salePrice * (percentage / 100));
    findProduct.productOffer = 0;
    findProduct.offerPrice =0;
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    console.error("error while removing the productOffer",error)
    res.redirect("/admin/pageError");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.findByIdAndUpdate(id, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageError");
  }
};

const unBlockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.findByIdAndUpdate(id, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageError");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const [product, category, brand] = await Promise.all([ 
      Product.findById({ _id: id }),
      Category.find({isListed:true}),
      Brand.find({})
    ]);
    const currentCategory = await Category.findOne({ _id: product.category });
    console.log("Current category",currentCategory)
    if (product && category && brand) {
      res.render("editProduct", {
        product: product,
        cat: category,
        brand: brand,
        currentCategory: currentCategory,
      });
      console.log("Rendered edit product page")
    } else {
      res.render("/admin/pageError");
    }
  } catch (error) {
    console.log("Error in getEditProduct", error);
    res.redirect("/admin/pageError");
  }
};

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
      return res.render("editProduct", {
        product: product,
        cat: category,
        brand: brand,
        currentCategory:currentCategory,
        message:
          "Product name already exists, please try again with another name",
      });
      //return res.status(400).json({error:"Product name already exists, please try with another name"})
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }
    const newCategoryId = await Category.findOne({name:data.category},{_id:1});
    console.log("newCAtegoryid",newCategoryId)
    console.log("images in editing ", images);
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: newCategoryId,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
      images: images,
    };
    if (req.files.length > 0) {
      updateFields.$push = {
        productImage: { $each: images },
      };
    }
    let result =  await Product.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    console.log("Data saved for editing the product" ,result );
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error in editProduct", error);
    res.redirect("/admin/pageError");
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    console.log("coming data", req.body);
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    // const imagePath = path.join("../../GentzGalleryApp/public/uploads/brands",imageNameToServer);
    const imagePath = path.resolve(
      __dirname,
      "../../public/uploads/brands",
      imageNameToServer
    );

    console.log("image path", imagePath);
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log("Image" + imageNameToServer + " deleted successfully");
      res.json({ status: true });
    } else {
      console.error("Image not found to delete", imageNameToServer);
      res.json({ status: false });
    }
  } catch (error) {
    console.error("Error in deleteSingleImage", error);
    res.redirect("/admin/pageError");
  }
};

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
