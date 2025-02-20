const User = require('../models/userSchema');
const Order = require('../models/orderSchema');
const mongoose = require('mongoose');


const getDateRange = (type) => {
    const now = new Date();
    let start, end;
    switch (type) {
        case 'salesToday':
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'salesWeekly':
            const startOfWeek = now.getDate() - now.getDay();
            start = new Date(now.setDate(startOfWeek));
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(startOfWeek + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'salesMonthly':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'salesYearly':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            start = end = now;
    }
    return { start, end };
};

const filter = async (filter,page) => {
    try {
        let limit = 5;      
        const skip = (page - 1) * limit;
        const { start, end } = getDateRange(filter);
        const [orders,count] = await Promise.all ([
            Order.find(
                { createdOn: { $gte: start, $lte: end } })
                .populate("userId")
                .populate("orderedItems")
                .populate("address")
                .skip(skip)
                .limit(limit)
                .exec(),
                Order.countDocuments({ createdOn: { $gte: start, $lte: end } })
            ])
        return {orders,count,start,end};       
    } catch (error) {
        console.log("Error while filtering data based on filter",error); 
    }
}


function chartFilter(timeFrame) {
    const groupBy = timeFrame === "salesDaily"
        ? { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } } 
        : timeFrame === "salesWeekly"
        ? { $concat: [
            { $toString: { $isoWeekYear: "$createdOn" } }, "-W",
            { $toString: { $isoWeek: "$createdOn" } }
          ] } 
        : timeFrame === "salesMonthly"
        ? { $concat: [
            { $toString: { $year: "$createdOn" } }, "-",
            { $toString: { $month: "$createdOn" } }
          ] } 
        : { $toString: { $year: "$createdOn" } };    
    return groupBy;
}



module.exports = {
    filter,
    chartFilter
}