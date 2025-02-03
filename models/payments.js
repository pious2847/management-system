const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customer: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        }
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sales',
        required: true
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
    paymentHistory: [{
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'momo', 'card', 'paystack'],
            required: true
        },
        paymentDate: {
            type: Date,
            default: Date.now()
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        },
        paystackReference: {
            type: String,
            sparse: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'partially_paid', 'completed'],
        default: 'pending'
    },
    dueDate: {
        type: Date,
        required: true
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total paid amount
paymentSchema.virtual('paidAmount').get(function() {
    return this.paymentHistory
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);
});

// Pre-save middleware to update status based on payments
paymentSchema.pre('save', function(next) {
    const paidAmount = this.paidAmount;
    
    if (paidAmount >= this.totalAmount) {
        this.status = 'completed';
        this.balanceAmount = 0;
    } else if (paidAmount > 0) {
        this.status = 'partially_paid';
        this.balanceAmount = this.totalAmount - paidAmount;
    } else {
        this.status = 'pending';
        this.balanceAmount = this.totalAmount;
    }
    
    next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;