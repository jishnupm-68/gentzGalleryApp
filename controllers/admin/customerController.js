

const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        // Extract search and pagination from query parameters
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;

        // Ensure page is valid
        if (page < 1) page = 1;

        const limit = 3;

        // Fetch user data with pagination and search
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        // Count total documents matching the query
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ],
        });

        // Render the 'customers' view with the required data
        res.render('customers', {
            users: userData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search,
        }
    );
    console.log(userData)
    } catch (error) {
        console.error("Error in customerInfo:", error);
        res.status(500).send("Server error");
    }
};

const customerBlocked = async(req,res)=>{
    try{
        let id = req.query.id.trim();
        await User.findByIdAndUpdate(id,{$set:{isBlocked:true}});
        res.redirect('/admin/users');
    }catch(error){
        res.redirect('/admin/pageError')
    }
}

const customerUnblocked = async(req,res)=>{
    let id = req.query.id.trim();
    try{
        await User.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        res.redirect('/admin/users');

    }catch(error){
        res.redirect('/admin/pageError')

    }

}


module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}

