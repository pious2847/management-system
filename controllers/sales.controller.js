const Sales = require('../models/sales');
const Materials = require('../models/materials');
const Finance = require('../models/finance');
const Customer = require('../models/customer');

// Create a new sale
exports.createSale = async (req, res) => {
    try {
        const { productId, quantitySold, name, phone, email, paymentType } = req.body;

        // Check if product exists and has enough stock
        const product = await Materials.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        if (product.stock < quantitySold) {
            throw new Error('Insufficient stock');
        }
        const customer = new Customer({
            name, 
            email, 
            phone
        })

        await customer.save();

        // Calculate total price
        const totalPrice = product.unitPrice * quantitySold;

        // Create sale record
        const sale = new Sales({
            productId,
            quantitySold,
            totalPrice,
            customer: customer._id,
        });

        await sale.save();

        // Update product stock
        product.stock -= quantitySold;
        await product.save();

        // Create corresponding finance record
        const financeRecord = new Finance({
            transactionType: 'income',
            category: 'sales',
            amount: totalPrice,
            description: `Sale of ${quantitySold} ${product.name} to ${customerName}`,
            referenceId: sale._id,
            referenceModel: 'Sales'
        });
        await financeRecord.save();

        req.flash('message', 'Sale created successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/sales');
    } catch (error) {
        console.error('Error creating sale:', error);
        req.flash('message', error.message || 'Error creating sale');
        req.flash('status', 'danger');
        res.redirect('/dashboard/sales');
    }
};

// Get all sales with pagination and filtering
exports.getAllSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const query = {};
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { 'product.name': { $regex: search, $options: 'i' } }
            ];
        }
        if (startDate || endDate) {
            query.saleDate = {};
            if (startDate) query.saleDate.$gte = startDate;
            if (endDate) query.saleDate.$lte = endDate;
        }

        const sales = await Sales.find(query)
            .populate('productId')
            .sort({ saleDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Sales.countDocuments(query);

        res.json({
            sales,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error('Error getting sales:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get sales statistics
exports.getSalesStats = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

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

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a sale
exports.updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { productId, quantitySold, customerName } = req.body;

        // Get the original sale
        const originalSale = await Sales.findById(id);
        if (!originalSale) {
            throw new Error('Sale not found');
        }

        // Get the product
        const product = await Materials.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Calculate stock difference
        const stockDifference = quantitySold - originalSale.quantitySold;
        if (product.stock < stockDifference) {
            throw new Error('Insufficient stock');
        }

        // Calculate new total price
        const totalPrice = product.unitPrice * quantitySold;

        // Update sale
        const sale = await Sales.findByIdAndUpdate(id, {
            productId,
            quantitySold,
            totalPrice,
            customerName
        }, { new: true });

        // Update product stock
        product.stock -= stockDifference;
        await product.save();

        // Update finance record
        await Finance.findOneAndUpdate(
            { referenceId: sale._id, referenceModel: 'Sales' },
            {
                amount: totalPrice,
                description: `Sale of ${quantitySold} ${product.name} to ${customerName}`
            }
        );

        req.flash('message', 'Sale updated successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/sales');
    } catch (error) {
        console.error('Error updating sale:', error);
        req.flash('message', error.message || 'Error updating sale');
        req.flash('status', 'danger');
        res.redirect('/dashboard/sales');
    }
};

// Delete a sale
exports.deleteSale = async (req, res) => {
    try {
        const { id } = req.params;

        // Get the sale
        const sale = await Sales.findById(id);
        if (!sale) {
            throw new Error('Sale not found');
        }

        // Restore product stock
        const product = await Materials.findById(sale.productId);
        if (product) {
            product.stock += sale.quantitySold;
            await product.save();
        }

        // Delete the sale
        await Sales.findByIdAndDelete(id);

        // Delete associated finance record
        await Finance.findOneAndDelete({
            referenceId: sale._id,
            referenceModel: 'Sales'
        });

        req.flash('message', 'Sale deleted successfully');
        req.flash('status', 'success');
        res.redirect('/dashboard/sales');
    } catch (error) {
        console.error('Error deleting sale:', error);
        req.flash('message', error.message || 'Error deleting sale');
        req.flash('status', 'danger');
        res.redirect('/dashboard/sales');
    }
};

// Export sales data
exports.exportSales = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const query = {};
        if (startDate || endDate) {
            query.saleDate = {};
            if (startDate) query.saleDate.$gte = startDate;
            if (endDate) query.saleDate.$lte = endDate;
        }

        const sales = await Sales.find(query)
            .populate('productId')
            .sort({ saleDate: -1 });

        const csvData = sales.map(sale => ({
            'Date': new Date(sale.saleDate).toLocaleDateString(),
            'Product': sale.productId.name,
            'Quantity': sale.quantitySold,
            'Total Price': `$${sale.totalPrice.toFixed(2)}`,
            'Customer': sale.customerName,
            'Status': sale.status
        }));

        // Generate CSV file
        const csv = require('fast-csv');
        const filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        csv.write(csvData, { headers: true })
            .pipe(res);
    } catch (error) {
        console.error('Error exporting sales:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get a single sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sales.findById(req.params.id);
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
