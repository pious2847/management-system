const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
    transactionType: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    category: {
        type: String,
        enum: ['sales', 'supplies', 'salary', 'maintenance', 'other'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Sales', 'Supply', null],
        default: null
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted amount
FinanceSchema.virtual('formattedAmount').get(function() {
    return `$${this.amount.toFixed(2)}`;
});

// Static method to calculate totals by type
FinanceSchema.statics.calculateTotals = async function(startDate, endDate) {
    const match = {};
    if (startDate || endDate) {
        match.transactionDate = {};
        if (startDate) match.transactionDate.$gte = startDate;
        if (endDate) match.transactionDate.$lte = endDate;
    }

    const result = await this.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
            $group: {
                _id: '$transactionType',
                total: { $sum: '$amount' }
            }
        }
    ]);

    const totals = {
        income: 0,
        expense: 0,
        net: 0
    };

    result.forEach(item => {
        totals[item._id] = item.total;
    });

    totals.net = totals.income - totals.expense;
    return totals;
};

// Static method to get monthly summary
FinanceSchema.statics.getMonthlyStats = async function(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    return this.aggregate([
        {
            $match: {
                transactionDate: { $gte: startDate, $lte: endDate },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: '$transactionDate' },
                    type: '$transactionType'
                },
                total: { $sum: '$amount' }
            }
        },
        {
            $group: {
                _id: '$_id.month',
                stats: {
                    $push: {
                        type: '$_id.type',
                        amount: '$total'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

const Finance = mongoose.model('Finance', FinanceSchema);

module.exports = Finance;
