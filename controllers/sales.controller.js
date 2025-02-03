const Sales = require('../models/sales');
const Materials = require('../models/materials');
const Finance = require('../models/finance');
const Customer = require('../models/customer');
const Payment = require('../models/payments');
const initiatePaystackPayment = require('../utils/payment');
const { generatePaymentInitializationMessage, generatePaymentConfirmationMessage, generatePaymentFailureMessage, generateBusinessPaymentNotification } = require('../utils/messages');
const { sendEmail } = require('../utils/MailSender');
const reportGenerator = require('../utils/reportGenerator');
const moment = require('moment');

// Create a new sale
exports.createSale = async (req, res) => {
    try {
        const {
            productId,
            quantitySold,
            customerId,
            name,
            phone,
            email,
            paymentMethod,
            paidAmount,
            paymentStatus
        } = req.body;



        // Validate required fields
        if (!productId || !quantitySold) {
            req.flash('message', 'Product ID and quantity sold are required');
            req.flash('status', 'danger');
            return res.redirect('/dashboard/sales');
        }

        // Check if product exists and has enough stock
        const product = await Materials.findById(productId);
        if (!product) {
            req.flash('message', 'Product not found');
            req.flash('status', 'danger');
            return res.redirect('/dashboard/sales');
        }
        if (product.stock < quantitySold) {
            req.flash('message', 'Insufficient stock');
            req.flash('status', 'danger');
            return res.redirect('/dashboard/sales');
        }

        let customer = customerId;

        // Create new customer if customerId is not provided and name is given
        if (!customerId && name) {
            const newCustomer = new Customer({ name, email, phone });
            await newCustomer.save();
            customer = newCustomer._id;
        }

        // Calculate total price
        const totalAmount = product.unitPrice * quantitySold;
        const paidAmounts = paidAmount ? parseInt(paidAmount, 10) : 0;
        const balanceAmount = totalAmount - paidAmounts;

        const payment = new Payment({
            customer,
            totalAmount,
            balanceAmount,
            paidAmount: paidAmounts,
            paymentHistory: [
                {
                    amount: paidAmounts,
                    paymentDate: new Date(),
                    paymentMethod,
                    paymentStatus
                }
            ],
            paymentStatus,
        });
        await payment.save();

        // Create sale record
        const sale = new Sales({
            productId,
            quantitySold,
            totalPrice: totalAmount,
            customer,
            payment: payment._id,
        });
        await sale.save();

        // Link sale to payment
        payment.sale = sale._id;
        await payment.save();

        // Update product stock
        product.stock -= quantitySold;
        await product.save();

        if (paymentStatus === 'paid' || paymentStatus === 'partially_paid') {

            // Create corresponding finance record
            const financeRecord = new Finance({
                transactionType: 'income',
                category: 'sales',
                amount: totalAmount,
                description: `Sale of ${quantitySold} ${product.name} to ${name || 'unknown customer'}`,
                referenceId: sale._id,
                referenceModel: 'Sales',
            });
            await financeRecord.save();
        }
        if (paymentStatus != 'paid') {
            const customerData = await Customer.findById(customer)

            const amount = paymentStatus === 'partially_paid' ? paidAmounts : totalAmount;

            const metadata = {
                customerId: customer,
                paidAmount: paidAmounts,
                product: product,
                paymentId: payment._id,
                amount: amount,
            }
            let initializePayment = {};

            if(paymentStatus != 'partially_paid') {
                initializePayment = await initiatePaystackPayment(customerData.email, amount, metadata);
            }

            const messageHtml = paymentStatus === 'partially_paid' ?
                generatePaymentConfirmationMessage(
                    customerData,
                    sale,
                    payment,
                    product,
                )
                : generatePaymentInitializationMessage(
                    customerData,
                    sale,
                    payment,
                    product,
                    initializePayment
                );

            await sendEmail(
                customerData.email,
                `Payment Required - Order #${sale._id}`,
                messageHtml
            );
        }

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
            .populate('customer')
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
            .populate('customer')
            .sort({ saleDate: -1 });

        const csvData = sales.map(sale => ({
            'Date': new Date(sale.saleDate).toLocaleDateString(),
            'Product': sale.productId.name,
            'Quantity': sale.quantitySold,
            'Total Price': `Gh₵ ${sale.totalPrice.toFixed(2)}`,
            'Customer': sale.customer.name,
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

/**
 * Enhanced download controller with support for multiple formats
 */
exports.downloadSalesReport = async (req, res) => {
    const { startDate, endDate, format = 'csv' } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required.'
        });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const salesData = await reportGenerator.generateSalesReport(start, end);

        const filename = `sales_report_${moment(start).format('YYYY-MM-DD')}_to_${moment(end).format('YYYY-MM-DD')}`;

        if (format === 'excel') {
            const workbook = await reportGenerator.generateExcelReport(salesData, start, end);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
            await workbook.xlsx.write(res);
        } else {
            const csvData = reportGenerator.generateCSVReport(salesData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
            res.send(csvData);
        }
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating sales report',
            error: error.message
        });
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
