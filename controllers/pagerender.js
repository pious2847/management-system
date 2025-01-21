const Materials = require("../models/materials");
const Supply = require("../models/supplies");
const User = require("../models/user");
const Sales = require('../models/sales');
const Finance = require('../models/finance');
const aggregateDataIntoMonths = require("../utils/aggregate");

const pageRender = {

    async getLogin(req, res){
        const alertMessage = req.flash("message");
        const alertStatus = req.flash("status");

        const alert = { message: alertMessage, status: alertStatus };

        res.render('login', {alert})
    },
    
    async getDashboard(req, res) {
        try {    const alertMessage = req.flash("message");
        const alertStatus = req.flash("status");

        const alert = { message: alertMessage, status: alertStatus };
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
                alert,
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
    },
    async getSales(req, res) {
        try {
            const alertMessage = req.flash('message');
            const alertStatus = req.flash('status');
            const alert = { message: alertMessage, status: alertStatus };
    
            let { page = 1, limit = 10, startDate, endDate } = req.query;
    
            page = parseInt(page);
            limit = parseInt(limit);
    
            const filter = {};
            if (startDate && endDate) {
                filter.saleDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
    
            // Fetch sales with pagination
            const sales = await Sales.find(filter)
                .populate('productId')
                .sort({ saleDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit);
    
            const total = await Sales.countDocuments(filter);
    
            const materials = await Materials.find();
    
            res.render('sales', {
                sales,
                materials,
                alert,
                total,
                page,
                limit,
                startDate,
                endDate,
                title: 'Sales Management'
            });
        } catch (error) {
            console.error('Error loading sales page:', error);
            req.flash('message', 'Error loading sales page');
            req.flash('status', 'danger');
            res.redirect('/dashboard');
        }
    },
    async getFinance(req, res) {
        try {
            const alertMessage = req.flash('message');
            const alertStatus = req.flash('status');
            const alert = { message: alertMessage, status: alertStatus };

            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30);

            const transactions = await Finance.find()
                .sort({ transactionDate: -1 })
                .limit(10);

            const totals = await Finance.calculateTotals(startDate, endDate);

            res.render('finance', { 
                transactions, 
                totals,
                alert,
                title: 'Finance Management'
            });
        } catch (error) {
            console.error('Error loading finance page:', error);
            req.flash('message', 'Error loading finance page');
            req.flash('status', 'danger');
            res.redirect('/dashboard');
        }
    }
}

module.exports = pageRender;