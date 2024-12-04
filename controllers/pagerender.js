const Materials = require("../models/materials");
const Supply = require("../models/supplies");
const User = require("../models/user");

const pageRender = {
    async getDashboard(req, res){
        try {
            const totalMaterials = await Materials.find().countDocuments()
            const totalUsers = await User.find().countDocuments()
            const totalSupplies = await Supply.find().countDocuments()

            res.render('dashboard', {
                totalMaterials,
                totalSupplies,
                totalUsers
            })
        } catch (error) {
            console.error(error);
        }
    },
    async getMaterials(req, res){
        try {
            const alertMessage = req.flash("message");
            const alertStatus = req.flash("status");

            const alert = { message: alertMessage, status: alertStatus };

            const materials = await Materials.find().sort({_id:-1});
            res.render('materials', {
                totalMaterials: 100,
                totalSupplies: 80,
                totalUsers: 50,
                materials,
                alert
            })
 
        } catch (error) {
            console.error(error);
        }
    },
    async getSupplies(req, res){
        const alertMessage = req.flash("message");
        const alertStatus = req.flash("status");

        const alert = { message: alertMessage, status: alertStatus };


        const materials = await Materials.find().sort({_id:-1});
        const supplies = await Supply.find().sort({_id:-1}).populate('material');
        res.render('supplies', {
            materials,
            supplies,
            alert
        })
    }
}

module.exports = pageRender;