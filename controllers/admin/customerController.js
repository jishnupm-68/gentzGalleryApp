const User = require('../../models/userSchema');


// Render the customers page with search option
const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let userFindCondition ={
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ],
        }
        let page = parseInt(req.query.page) || 1;
        if (page < 1) page = 1;
        const limit = 3;
        const [userData, count] = await Promise.all([
            User.find(userFindCondition)
            .limit(limit)
            .skip((page - 1) * limit)
            .lean(),
            User.countDocuments(userFindCondition),
        ]);
        res.render('customers', {
            users: userData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search,
        }
    );
    console.log("rendered customers page")
    } catch (error) {
        console.error("Error in customerInfo:", error);
        res.status(500).send("Server error");
    }
};

// Block a customer
const customerBlocked = async(req,res)=>{
    try{
        let id = req.query.id.trim();
        await User.findByIdAndUpdate(id,{$set:{isBlocked:true}});
        console.log("customer blocked successfully")
        res.json({success:true, message:"Customer blocked successfully"})
    }catch(error){
        console.error("Error in customerBlocked:", error);
        res.json({success:false, message:"Failed to block customer"})
    }
}

// Unblock a customer
const customerUnblocked = async(req,res)=>{
    let id = req.query.id.trim();
    try{
        await User.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        res.json({success:true, message:"Customer unblocked successfully"});
        console.log("customer unblocked successfully")
    }catch(error){
        console.error("Error in customerUnblocked:", error);
        res.json({success:false, message:"Failed to unblock customer"})
    }
}

//exporting the functions
module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}

