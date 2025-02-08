const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sales',
    },
    product:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Materials'
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    balanceAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'partially_paid'],
        default: 'pending'
    },
    paymentHistory: [{
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'credit'],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'partially_paid'],
            default: 'pending'
        },
        paymentDate: {
            type: Date,
            default: Date.now()
        },
        paystackReference: {
            type: String,
            sparse: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    }],

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total paid amount
paymentSchema.virtual('totalPaidAmount').get(function () {
    return this.paymentHistory
        .filter(payment => payment.paymentStatus === 'paid')
        .reduce((sum, payment) => sum + payment.amount, 0);
});


const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;