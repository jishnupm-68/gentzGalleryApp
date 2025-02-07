
const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        if (page < 1) page = 1;
        const limit = 3;
        const [userData, count] = await Promise.all([
            User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean(),
        
            User.countDocuments({
                isAdmin: false,
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            }),
        ]);
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
        console.log("customer blocked successfully")
        res.redirect('/admin/users');
    }catch(error){
        console.error("Error in customerBlocked:", error);
        res.redirect('/admin/pageError')
    }
}

const customerUnblocked = async(req,res)=>{
    let id = req.query.id.trim();
    try{
        await User.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        res.redirect('/admin/users');
        console.log("customer unblocked successfully")
    }catch(error){
        console.error("Error in customerUnblocked:", error);
        res.redirect('/admin/pageError')
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}

