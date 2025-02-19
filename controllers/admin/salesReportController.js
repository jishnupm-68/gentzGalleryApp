const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const filterSalesReportAdmin  = require('../../helpers/filterSalesReportAdmin')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs'); 
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
let currentPageData;


const loadSalesReport = async (req, res) => {
  if (req.session.admin) {
    try {
      let limit = 5;
      const page = req.query.page || 1;
      console.log("render the dashboard");
     
      const [orderData, count, salesCount] = await Promise.all([
        Order.find({
          status: "Verified",
          "orderedItems.productStatus": "Delivered",
        })
          .populate("userId")
          .populate("orderedItems.product") 
          .populate("address")
          .sort({ createdOn: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .exec(),
      
        Order.countDocuments({
          status: "Verified",
          "orderedItems.productStatus": "Delivered",
        }),
      
        Order.aggregate([
          { $match: { status: "Verified", "orderedItems.productStatus": "Delivered" } },
          { $unwind: "$orderedItems" },
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$orderedItems.quantity" },
              totalPrice: { $sum: "$totalPrice" },
              discount: { $sum: "$discount" },
              finalAmount: { $sum: "$finalAmount" },
            },
          },
        ]),
      ]);
      
      if (orderData.length > 0) {
        const [{ totalSales }] = salesCount;
        console.log("totalsales", salesCount, totalSales, "totalORder", count);
        console.log("orderData,", orderData);
        currentPageData = orderData;
        res.render("salesReport", {
          data: orderData,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          startDate:null,
          endDate:null
        });
      } else {
        res.render("salesReport", {
          data: null,
          currentPage: page,
          totalPages: 1,
          startDate:null,
          endDate:null
        });
      }
    } catch (error) {
      console.log("error while rendering salesreport", error);
      res.redirect("/admin/pageError");
    }
  }
};   

const displayFilteredData = async (req, res) => {
    if (req.session.admin) {
        try {
            const { startDate, endDate, page = 1, limit = 5 } = req.query;
            const start = startDate ? new Date(startDate) : new Date('1970-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            const [orderData, count, salesCount] = await Promise.all([
                Order.find({
                    createdOn: {
                        $gte: start,
                        $lte: end
                    }
                })
                .populate("userId")
                .populate("orderedItems")
                .populate("address")
                .sort({ createdOn: -1 })
                .limit(limit)
                .skip((page - 1) * limit)
                .exec(),
                Order.countDocuments({
                    createdOn: {
                        $gte: start,
                        $lte: end
                    }
                }),
                 Order.aggregate([
                    { $match: { createdOn: { $gte: start, $lte: end } } },
                    { $unwind: "$orderedItems" },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: "$orderedItems.quantity" },
                            totalPrice: { $sum: "$totalPrice" },
                            discount: { $sum: "$discount" },
                            finalAmount: { $sum: "$finalAmount" },
                        }
                    }
                ])
            ]);           
            if (orderData.length > 0) {
                console.log(orderData)
                currentPageData = orderData;
                const [{ totalSales, totalPrice, discount, finalAmount }] = salesCount;
                res.render("dashboard",{
                    totalOrders: count,
                    totalSales,
                    totalPrice,
                    totalDiscount: discount,
                    finalAmount,
                    data: orderData,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    startDate,
                    endDate
                });
            } else {
                res.render("dashboard",{
                    totalOrders: 0,
                    totalSales: 0,
                    totalPrice: 0,
                    totalDiscount: 0,
                    finalAmount: 0,
                    data: [],
                    currentPage: page,
                    totalPages: 1,
                    startDate,
                    endDate
                });
            }
        } catch (error) {
            console.error("Error while displaying the data", error);
            res.redirect("/admin/pageError");
        }
    }
};

const generatePdf = async (req, res) => {
  try {
    console.log("data to be converted", currentPageData)
    const orderData = currentPageData;
    const [count, salesCount] = await Promise.all([
      Order.countDocuments({}),
      Order.aggregate([
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$orderedItems.quantity" },
            totalPrice: { $sum: "$totalPrice" },
            discount: { $sum: "$discount" },
            finalAmount: { $sum: "$finalAmount" },
          },
        },
      ]),
    ]);
    const totalsales = salesCount;
    const doc = new PDFDocument();
    let chunks = [];
    let result;
    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.pdf"
      );
      res.send(result);
    });
    //  title
    doc.fontSize(20).text("Sales Report : GentzGallery", { align: "center" });
    //  space
    doc.moveDown();
    // Add total sales data
    // doc.fontSize(12).text(`Total Orders: ${count}`);
    // doc.fontSize(12).text(`Total sales: ${totalsales[0].totalSales}`);
    // doc.fontSize(12).text(`Total Price: ${totalsales[0].totalPrice}`);
    // doc.fontSize(12).text(`Total Discount: ${totalsales[0].discount}`);
    // doc.fontSize(12).text(`Final Amount: ${totalsales[0].finalAmount}`);
    
    doc.moveDown();
    // Add each order's details
    orderData.forEach((order, index) => {
      doc.fontSize(12).text(`Order #${index + 1}`);
      doc
        .fontSize(10)
        .text(
          `Invoice Date: ${new Date(order.createdOn).toLocaleDateString()}`
        );
      doc.fontSize(10).text(`User Name: ${order.userId.name}`);
      doc.fontSize(10).text(`User Email: ${order.userId.email}`);
      doc.fontSize(10).text(`Total Price: ${order.totalPrice}`);
      doc.fontSize(10).text(`Discount: ${order.discount}`);
      doc.fontSize(10).text(`Final Amount: ${order.finalAmount}`);
      doc.fontSize(10).text(`Payment Method: ${order.payment}`);
      doc.moveDown();
    });
    // Finalize the PDF
    doc.end();
    console.log("PDF generated successfully");
  } catch (error) {
    console.error("Error while generating the PDF", error);
    res.redirect("/admin/pageError");
  }
};

const generateExcelReport = async (req, res) => {
  try {
    const orderData = currentPageData; 
    const [count, salesCount] = await Promise.all([
      Order.countDocuments({}),
      Order.aggregate([
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$orderedItems.quantity" },
            totalPrice: { $sum: "$totalPrice" },
            discount: { $sum: "$discount" },
            finalAmount: { $sum: "$finalAmount" },
          },
        },
      ]),
    ]);
    const totalsales = salesCount[0];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");
    // Add a title
    worksheet.mergeCells("A1", "G1");
    worksheet.getCell("A1").value = "Sales Report : GentzGallery";
    worksheet.getCell("A1").font = { size: 20, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };
    // Add total sales data
    // worksheet.addRow([]);
    // worksheet.addRow(["Total Orders:", count]);
    // worksheet.addRow(["Total Sales:", totalsales.totalSales]);
    // worksheet.addRow(["Total Price:", totalsales.totalPrice]);
    // worksheet.addRow(["Total Discount:", totalsales.discount]);
    // worksheet.addRow(["Final Amount:", totalsales.finalAmount]);
    // Add some space
    worksheet.addRow([]);
    // Add each order's details in a table
    worksheet.addRow([
      "Order #",
      "Invoice Date",
      "User Name",
      "User Email",
      "Total Price",
      "Discount",
      "Final Amount",
      "Payment Method",
    ]);
    orderData.forEach((order, index) => {
      worksheet.addRow([
        index + 1,
        new Date(order.createdOn).toLocaleDateString(),
        order.userId.name,
        order.userId.email,
        order.totalPrice,
        order.discount,
        order.finalAmount,
        order.payment,
      ]);
    });
    // Write to the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
    console.log("Excel report generated successfully");
  } catch (error) {
    console.error("Error while generating the Excel report", error);
    res.redirect("/admin/pageError");
  }
};

const salesReport =async(req,res)=>{
    try {
      const limit =5;
        const filter = req.query.day
        const page = req.query.page || 1;
        const {orders,count,start,end} = await filterSalesReportAdmin.filter(filter,page);
        currentPage = orders
        console.log("result",filter,orders, start,end,count)
        res.render("dashboard", {
          data: orders,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          filter: filter,
        });
        
    } catch (error) {
        console.error("Error while displaying sales report", error);
        res.redirect("/admin/pageError");      
    }
}

const salesSummary = async (req, res) => {
  try {
    const [count, summary] = await Promise.all ([
     
        Order.countDocuments({}),
        Order.aggregate([
          { $unwind: "$orderedItems" },
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$orderedItems.quantity" },
              totalPrice: { $sum: "$totalPrice" },
              discount: { $sum: "$discount" },
              finalAmount: { $sum: "$finalAmount" },
            },
          },
        ]),
  ]);
  console.log(summary);
  const totalsales = count;
    const doc = new PDFDocument();
    let chunks = [];
    let result;
    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.pdf"
      );
      res.send(result);
    });
    // Add a title
    doc.fontSize(20).text("Sales Report : GentzGallery", { align: "center" });
    // Add some space
    doc.moveDown();
    // Add total sales data
    doc.fontSize(12).text(`Total Orders: ${count}`);
    doc.fontSize(12).text(`Total sales: ${summary[0].totalSales}`);
    doc.fontSize(12).text(`Total Price: ${summary[0].totalPrice}`);
    doc.fontSize(12).text(`Total Discount: ${summary[0].discount}`);
    doc.fontSize(12).text(`Final Amount: ${summary[0].finalAmount}`);
    // Add some space
    doc.moveDown();
    // Add each order's details
    
    // Finalize the PDF
    doc.end();
    console.log("PDF generated successfully");
  
    

    
  } catch (error) {
    console.error("error while making sales summary",error);
    res.redirect("/admin/pageError");   
  }
}
  

module.exports = {
    
    loadSalesReport,
    generatePdf,
    generateExcelReport,
    displayFilteredData,
    salesReport,
    salesSummary
}

