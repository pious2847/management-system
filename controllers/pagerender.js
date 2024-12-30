const Materials = require("../models/materials");
const Supply = require("../models/supplies");
const User = require("../models/user");
const aggregateDataIntoMonths = require("../utils/aggregate");

const pageRender = {
    async getDashboard(req, res) {
        try {
            const totalMaterials = await Materials.find().countDocuments();
            const totalUsers = await User.find().countDocuments();
            const totalSupplies = await Supply.find().countDocuments();
            const LOW_STOCK_THRESHOLD = 10;
            const totalLowMaterials = await Materials.find({ stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 } }).countDocuments();

            // Format data for charts
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const materialRecords = await aggregateDataIntoMonths(Materials)
            const supplyRecords = await aggregateDataIntoMonths(Supply)

            res.render('dashboard', {
                totalMaterials,
                totalSupplies,
                totalUsers,
                totalLowMaterials,
                months: JSON.stringify(months),
                materialData: materialRecords,
                supplyData: supplyRecords
            });
        } catch (error) {
            console.error(error);
        }
    },
    async getMaterials(req, res) {
        try {
            const alertMessage = req.flash("message");
            const alertStatus = req.flash("status");

            const alert = { message: alertMessage, status: alertStatus };

            const materials = await Materials.find().sort({ _id: -1 });
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
    async getSupplies(req, res) {
        const alertMessage = req.flash("message");
        const alertStatus = req.flash("status");

        const alert = { message: alertMessage, status: alertStatus };


        const materials = await Materials.find().sort({ _id: -1 });
        const supplies = await Supply.find().sort({ _id: -1 }).populate('material');
        res.render('supplies', {
            materials,
            supplies,
            alert
        })
    },
    async getLowStockMaterials(req, res) {
        try {
            const alertMessage = req.flash("message");
            const alertStatus = req.flash("status");

            const alert = { message: alertMessage, status: alertStatus };

            const LOW_STOCK_THRESHOLD = 10
            const materials = await Materials.find({ stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 } }).sort({ _id: -1 });

            res.render('lowstock', {
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
    async getUsers(req, res) {
        try {
            const alertMessage = req.flash("message");
            const alertStatus = req.flash("status");

            const alert = { message: alertMessage, status: alertStatus };

            const users = await User.find()

            res.render('users', { alert, users })
        } catch (error) {

        }
    }
}

module.exports = pageRender;