const Order = require('../../models/orderSchema');
const filterSalesReportAdmin  = require('../../helpers/filterSalesReportAdmin')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs'); 
const mongoose = require('mongoose');
let currentPageData;
let countDocumentsFilter = {
  status: "Verified",
  "orderedItems.productStatus": "Delivered"
}

let startDay, endDay;
//rendering and display sales report
const salesReport =async(req,res)=>{
  try {
    const limit =5;
      const filter = req.query.day==undefined? "salesToday":req.query.day;    
      const page = req.query.page || 1;
      const {orders,count,start,end} = await filterSalesReportAdmin.filter(filter,page);
      startDay = start;
      endDay = end;
      currentPage = orders
      currentPageData = orders
      console.log("Rendering the sales report page")
      res.render("salesReport", {
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

//rendering and display the filtered data
const displayFilteredData = async (req, res) => {
    if (req.session.admin) {
        try {
            const { startDate, endDate, page = 1, limit = 5 } = req.query;
            const start = startDate ? new Date(startDate) : new Date('1970-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            startDay = start;
            endDay = end;
            const [orderData, count, salesCount] = await Promise.all([
                Order.find({
                    status: "Verified",
                    "orderedItems.productStatus": "Delivered",
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
                   status: "Verified",
                   "orderedItems.productStatus": "Delivered",
                    createdOn: {
                        $gte: start,
                        $lte: end
                    }
                }),
                 Order.aggregate([
                    { $match: countDocumentsFilter },
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
                currentPageData = orderData;
                const [{ totalSales, totalPrice, discount, finalAmount }] = salesCount;
                res.render("salesReport",{
                    totalOrders: count,
                    totalSales,
                    totalPrice,
                    totalDiscount: discount,
                    finalAmount,
                    data: orderData,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    startDate,
                    endDate,
                    filter:null,
                });
                console.log("Rendering the sales report page after filtering")
            } else {
                res.render("salesReport",{
                    totalOrders: 0,
                    totalSales: 0,
                    totalPrice: 0,
                    totalDiscount: 0,
                    finalAmount: 0,
                    data: [],
                    currentPage: page,
                    totalPages: 1,
                    startDate,
                    endDate,
                    filter:null,
                });
                console.log("Rendering the sales report page after filtering but no data found")
            }
        } catch (error) {
            console.error("Error while displaying the data", error);
            res.redirect("/admin/pageError");
        }
    }
};



//generating excel report
const generateExcelReport = async (req, res) => {
  try {
    const orderData = await Order.find(
      { status: "Verified", "orderedItems.productStatus": "Delivered",
          createdOn: { $gte: startDay, $lte: endDay } })
      .populate("userId")
      .populate("orderedItems")
      .populate("address")
      .lean()
      .exec();
    const totals = orderData.reduce((acc, order) => {
      acc.totalSales += 1;
      acc.totalPrice += order.totalPrice;
      acc.discount += order.discount;
      acc.finalAmount += order.finalAmount;
      return acc;
    }, { totalSales: 0, totalPrice: 0, discount: 0, finalAmount: 0 });
    const [count, salesCount] = await Promise.all([
      Order.countDocuments(countDocumentsFilter),
      Order.aggregate([
        { $match: countDocumentsFilter },
        { $unwind: "$orderedItems" },
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
    worksheet.addRow([]);
    worksheet.addRow(["Total Orders:", count]);
    worksheet.addRow(["Total Sales:", totals.totalSales]);
    worksheet.addRow(["Total Price:", totals.totalPrice]);
    worksheet.addRow(["Total Discount:", totals.discount]);
    worksheet.addRow(["Final Amount:", totals.finalAmount]);
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

//create and display sales summary pdf
const salesSummary = async (req, res) => {
  try {
    const [count, summary] = await Promise.all ([ 
      Order.countDocuments(countDocumentsFilter),
        Order.aggregate([
          { $match: countDocumentsFilter },
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
    // Finalize the PDF
    doc.end();
    console.log("PDF generated successfully");
    
  } catch (error) {
    console.error("error while making sales summary",error);
    res.redirect("/admin/pageError");   
  }
}
  
// Function to generate a PDF
const generatePdf = async (req, res) => {
  try {
    const orderData =await   Order.find(
                    { status: "Verified", "orderedItems.productStatus": "Delivered",
                        createdOn: { $gte: startDay, $lte: endDay } })
                    .populate("userId")
                    .populate("orderedItems")
                    .populate("address")
                    .lean()
                    .exec();
    // Calculate totals
    const totals = orderData.reduce((acc, order) => {
      acc.totalSales += 1;
      acc.totalPrice += order.totalPrice;
      acc.discount += order.discount;
      acc.finalAmount += order.finalAmount;
      return acc;
    }, { totalSales: 0, totalPrice: 0, discount: 0, finalAmount: 0 });

    const doc = new PDFDocument({ margin: 30, layout: 'landscape' });

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

    // Title
    doc.fontSize(20).text("Sales Report : GentzGallery", { align: "center" });
    doc.moveDown();

    // Add total sales data
    doc.fontSize(12).text(`Total Orders: ${totals.totalSales}`);
    doc.fontSize(12).text(`Total Sales: ${totals.totalSales}`);
    doc.fontSize(12).text(`Total Price: ${totals.totalPrice}`);
    doc.fontSize(12).text(`Total Discount: ${totals.discount}`);
    doc.fontSize(12).text(`Final Amount: ${totals.finalAmount}`);
    doc.moveDown();

    // Add table heading
    doc.fontSize(16).text("Order Details", { underline: true, align: "left" });
    doc.fontSize(12).text(`Orders between:- ${new Date(startDay).toLocaleDateString()} - ${new Date(endDay).toLocaleDateString()}`,{align: "left"});
    doc.moveDown();

    // Add a single table for all orders
  
    const table = {
      headers: ["slno","Invoice Date", "User Name", "User Email", "Total Price", "Discount", "Final Amount", "Payment Method"],
      rows: orderData.map((order,index) => [
        index+1,
        new Date(order.createdOn).toLocaleDateString(),
        order.userId.name,
        order.userId.email,
        order.totalPrice,
        order.discount,
        order.finalAmount,
        order.payment,
      ]),
    };
    drawTable(doc, table);
    // Finalize the PDF
    doc.end();
    console.log("PDF generated successfully");
  } catch (error) {
    console.error("Error while generating the PDF", error);
    res.redirect("/admin/pageError");
  }
};

// Function to draw a table with alignment and borders
function drawTable(doc, table) {
  const startX = doc.x;
  let startY = doc.y;

  const colWidths = [50,80, 120, 150, 70, 70, 100, 100];

  // Draw table border
  doc.rect(startX, startY, colWidths.reduce((acc, width) => acc + width, 0), 20 + (table.rows.length * 20)).stroke();

  // Headers
  doc.font("Helvetica-Bold").fontSize(10);
  table.headers.forEach((text, i) => {
    doc.rect(startX + colWidths.slice(0, i).reduce((acc, width) => acc + width, 0), startY, colWidths[i], 20).stroke();
    doc.text(text, startX + colWidths.slice(0, i).reduce((acc, width) => acc + width, 0) + 5, startY + 5, {
      width: colWidths[i] - 10,
      align: 'center'
    });
  });
  startY += 20;

  doc.font("Helvetica").fontSize(10);

  // Rows
  table.rows.forEach(row => {
    row.forEach((text, i) => {
      doc.rect(startX + colWidths.slice(0, i).reduce((acc, width) => acc + width, 0), startY, colWidths[i], 20).stroke();
      doc.text(text.toString(), startX + colWidths.slice(0, i).reduce((acc, width) => acc + width, 0) + 5, startY + 5, {
        width: colWidths[i] - 10,
        align: 'center'
      });
    });
    startY += 20;
  });

  doc.moveDown();
}

//exporting functions
module.exports = {   
    generatePdf,
    generateExcelReport,
    displayFilteredData,
    salesReport,
    salesSummary
}

