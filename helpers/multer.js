const multer = require("multer");
const path = require("path");

// const storage = multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,path.join(__dirname,"../../public/uploads/product-images"));

//     },
//     filename:(req,file,cb)=>{
//         cb(null,Date.now()+"-"+file.originalname)
//     }
// })





const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../GentzGalleryApp/public/uploads/brands");
        cb(null, uploadPath); // Files will be saved in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname); // Add a unique suffix to the file name
    },
});





module.exports = storage


