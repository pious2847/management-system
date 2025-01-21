const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Materials',
        required: true
    },
    quantitySold: {
        type: Number,
        required: true,
        min: 1
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    customerName: {
        type: String,
        required: true
    },
    saleDate: {
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

// Pre-save middleware to calculate total price
SalesSchema.pre('save', async function(next) {
    try {
        if (this.isModified('quantitySold') || this.isModified('productId') || !this.totalPrice) {
            const Materials = mongoose.model('Materials');
            const product = await Materials.findById(this.productId);
            if (!product) {
                throw new Error('Product not found');
            }
            // Calculate total price based on product unit price and quantity
            this.totalPrice = product.unitPrice * this.quantitySold;
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Virtual for formatted price
SalesSchema.virtual('formattedTotalPrice').get(function() {
    return this.totalPrice ? `$${this.totalPrice.toFixed(2)}` : '$0.00';
});

const Sales = mongoose.model('Sales', SalesSchema);

module.exports = Sales;
