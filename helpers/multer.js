
const { CloudinaryStorage } = require("multer-storage-cloudinary"); 
const cloudinary = require("../config/cloudinary");
const multer = require("multer");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "gentz_gallery_products", // Cloudinary folder
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});


module.exports = storage;



