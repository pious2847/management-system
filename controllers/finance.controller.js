const Finance = require('../models/finance');

// Create a new transaction
exports.createTransaction = async (req, res) => {
    try {
        const { transactionType, category, amount, description, transactionDate } = req.body;
        
        const transaction = new Finance({
            transactionType,
            category,
            amount,
            description,
            transactionDate: transactionDate || new Date()
        });

        await transaction.save();
        
        req.flash('message', 'Transaction created successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/finance');
    } catch (error) {
        console.error('Error creating transaction:', error);
        req.flash('message', error.message || 'Error creating transaction');
        req.flash('status', 'danger');
        res.redirect('/dashboard/finance');
    }
};

// Get all transactions with pagination and filtering
exports.getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const type = req.query.type;
        const category = req.query.category;
        const search = req.query.search || '';

        const query = {};
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = startDate;
            if (endDate) query.transactionDate.$lte = endDate;
        }
        if (type) query.transactionType = type;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        const transactions = await Finance.find(query)
            .sort({ transactionDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Finance.countDocuments(query);

        res.json({
            transactions,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get finance statistics
exports.getFinanceStats = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);

        // Get totals
        const [income, expenses] = await Promise.all([
            Finance.aggregate([
                {
                    $match: {
                        transactionType: 'income',
                        transactionDate: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            Finance.aggregate([
                {
                    $match: {
                        transactionType: 'expense',
                        transactionDate: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ])
        ]);

        const totals = {
            income: income[0]?.total || 0,
            expenses: expenses[0]?.total || 0,
            net: (income[0]?.total || 0) - (expenses[0]?.total || 0)
        };

        // Get daily totals for chart
        const dailyTotals = await Finance.aggregate([
            {
                $match: {
                    transactionDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
                        type: '$transactionType'
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    income: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
                        }
                    },
                    expenses: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get expense distribution by category
        const expensesByCategory = await Finance.aggregate([
            {
                $match: {
                    transactionType: 'expense',
                    transactionDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            totals,
            dailyTotals,
            expensesByCategory: expensesByCategory.reduce((acc, curr) => {
                acc[curr._id] = curr.total;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Error getting finance stats:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;
        
        const transaction = await Finance.findByIdAndUpdate(id, update, { new: true });
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        req.flash('message', 'Transaction updated successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/finance');
    } catch (error) {
        console.error('Error updating transaction:', error);
        req.flash('message', error.message || 'Error updating transaction');
        req.flash('status', 'danger');
        res.redirect('/dashboard/finance');
    }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        
        const transaction = await Finance.findByIdAndDelete(id);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        req.flash('message', 'Transaction deleted successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/finance');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        req.flash('message', error.message || 'Error deleting transaction');
        req.flash('status', 'danger');
        res.redirect('/dashboard/finance');
    }
};

// Export finance data
exports.exportFinance = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const query = {};
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = startDate;
            if (endDate) query.transactionDate.$lte = endDate;
        }

        const transactions = await Finance.find(query).sort({ transactionDate: -1 });

        const csvData = transactions.map(transaction => ({
            'Date': new Date(transaction.transactionDate).toLocaleDateString(),
            'Type': transaction.transactionType,
            'Category': transaction.category,
            'Amount': `$${transaction.amount.toFixed(2)}`,
            'Description': transaction.description
        }));

        const csv = require('fast-csv');
        const filename = `finance_report_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        csv.write(csvData, { headers: true })
            .pipe(res);
    } catch (error) {
        console.error('Error exporting finance data:', error);
        res.status(500).json({ message: error.message });
    }
};
