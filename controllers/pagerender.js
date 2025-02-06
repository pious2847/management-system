const Materials = require("../models/materials");
const Supply = require("../models/supplies");
const User = require("../models/user");
const Sales = require('../models/sales');
const Finance = require('../models/finance');
const aggregateDataIntoMonths = require("../utils/aggregate");
const Customer = require("../models/customer");
const transaction = require("paystack-api/resources/transaction");

const pageRender = {

    async getLogin(req, res) {
        const alertMessage = req.flash("message");
        const alertStatus = req.flash("status");

        const alert = { message: alertMessage, status: alertStatus };

        res.render('login', { alert })
    },

    async getDashboard(req, res) {
        try {
            const alertMessage = req.flash("message");
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
                supplyData: supplyRecords,
                path: '/dashboard'
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
                alert,
                path: '/dashboard/materials'

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
            alert,
            path: '/dashboard/supplies'

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
                alert,
                path: '/dashboard/low-stock'
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

                
            res.render('users', { alert, users, path: '/dashboard/users'})
        } catch (error) {
            console.error('Error loading user page:', error);
            req.flash('message', 'Error loading user page');
            req.flash('status', 'danger');
            res.redirect('/dashboard');
        }
    },
    async getSales(req, res) {
        try {
            const alertMessage = req.flash('message');
            const alertStatus = req.flash('status');
            const alert = { message: alertMessage, status: alertStatus };

            let { page = 1, limit = 10, } = req.query;

            const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

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
                .populate('customer')
                .populate('payment')
                .sort({ saleDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Count total sales
            const total = await Sales.countDocuments(filter);

            const stats = await Sales.aggregate([
                {
                    $match: {
                        ...(startDate || endDate ? {
                            saleDate: {
                                ...(startDate && { $gte: startDate }),
                                ...(endDate && { $lte: endDate })
                            }
                        } : {})
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$saleDate' },
                            month: { $month: '$saleDate' }
                        },
                        totalSales: { $sum: '$totalPrice' },
                        totalItems: { $sum: '$quantitySold' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            let totalCostPrice = 0;
            let totalSellingPrice = 0;
            let TotalCurrentAmount = 0;
            let Profit = 0;


            sales.forEach(sale=>{
                TotalCurrentAmount += (sale.payment.paidAmount != 0 ? sale.payment.balanceAmount:sale.payment.totalAmount);
                totalCostPrice += ((sale.productId.unitPrice)*(sale.quantitySold));
                totalSellingPrice += ((sale.productId.sellingPrice)*(sale.quantitySold));

            });

            Profit = totalSellingPrice - totalCostPrice;

            const totalSales = stats.reduce((sum, item) => sum + item.totalSales, 0);
            const totalItems = stats.reduce((sum, item) => sum + item.totalItems, 0);
            const avgSale = (totalSales / stats.reduce((sum, item) => sum + item.count, 0)) || 0;
            
            const materials = await Materials.find();
            const customers = await Customer.find();

            res.render('sales', {
                customers,
                sales,
                materials,
                alert,
                total,
                page,
                limit,
                startDate,
                endDate,
                title: 'Sales Management',
                isEdit: false,
                totalSales,
                totalItems,
                avgSale,
                stats,
                Profit,
                path: '/dashboard/sales'
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
            const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

            let { page = 1, limit = 10,transactionType='' } = req.query;

            const filter = {};
            if (startDate && endDate) {
                filter.transactionDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            if(transactionType){
                filter.transactionType = transactionType;
            }

            const transactions = await Finance.find(filter)
                .sort({ transactionDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await Finance.countDocuments(filter);

            const totals = await Finance.calculateTotals(startDate, endDate);
            let totalIncome = 0;
            let totalExpenses = 0;

            const incomes = transactions.filter(transaction=>
                transaction.transactionType === 'income'
            )
            const expenses = transactions.filter(transaction=>
                transaction.transactionType === 'expense'
            )
              
            incomes.forEach(income => {
                totalIncome += income.amount;
            });
            expenses.forEach(expense => {
                totalExpenses += expense.amount;
            });

            res.render('finance', {
                transactions,
                totals,
                alert,
                title: 'Finance Management',
                totalIncome,
                totalExpenses,
                total,
                page,
                limit, 
                startDate,
                endDate,
                path: '/dashboard/finance',
                transactionType
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