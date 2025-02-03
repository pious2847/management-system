const Payment = require('../models/payments');
const Sales = require('../models/sales');
const Finance = require('../models/finance');
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const { generatePaymentInitializationMessage, generatePaymentConfirmationMessage, generatePaymentFailureMessage, generateBusinessPaymentNotification } = require('../utils/messages');
const { sendEmail } = require('../utils/MailSender');
const reportGenerator = require('../utils/reportGenerator');
const moment = require('moment');

const PaymentController = {
    // Create new payment record for a sale
    async createPayment(req, res) {
        try {
            const { saleId, customerName, customerEmail, customerPhone, dueDate } = req.body;
            
            const sale = await Sales.findById(saleId).populate('productId');
            if (!sale) {
                throw new Error('Sale not found');
            }

            const payment = new Payment({
                customer: {
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone
                },
                sale: saleId,
                totalAmount: sale.totalPrice,
                balanceAmount: sale.totalPrice,
                dueDate: new Date(dueDate)
            });

            await payment.save();

            req.flash('message', 'Payment record created successfully');
            req.flash('status', 'success');
            res.redirect('/dashboard/payments');
        } catch (error) {
            console.error('Error creating payment:', error);
            req.flash('message', error.message);
            req.flash('status', 'danger');
            res.redirect('/dashboard/payments');
        }
    },

    // Initialize Paystack payment
    async initializePaystackPayment(req, res) {
        try {
            const { paymentId, amount, email } = req.body;
            
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (amount > payment.balanceAmount) {
                throw new Error('Amount exceeds balance');
            }

            const response = await paystack.transaction.initialize({
                amount: amount * 100, // Convert to kobo
                email: email,
                metadata: {
                    paymentId,
                    custom_fields: [
                        {
                            display_name: "Payment For",
                            variable_name: "payment_for",
                            value: payment.customer.name
                        }
                    ]
                }
            });


            res.json({ authorization_url: response.data.authorization_url });
        } catch (error) {
            console.error('Error initializing payment:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Verify Paystack webhook
    async paystackWebhook(req, res) {
        try {
            // Verify webhook signature
            const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                .update(JSON.stringify(req.body))
                .digest('hex'); 
    
            if (hash !== req.headers['x-paystack-signature']) {
                console.error('Invalid Paystack signature');
                return res.sendStatus(401);
            }
    
            const event = req.body;
    
            // Handle successful charges
            if (event.event === 'charge.success') {
                const { 
                    paymentId, 
                    customerId,
                    amount,
                    product 
                } = event.data.metadata;
    
                // Find payment record
                const payment = await Payment.findById(paymentId)
                    .populate('customer')
                    .populate('sale');
    
                if (!payment) {
                    console.error(`Payment not found: ${paymentId}`);
                    return res.sendStatus(404);
                }
    
                const paidAmount = event.data.amount / 100;
    
                // Update payment record
                payment.paymentHistory.push({
                    amount: paidAmount,
                    paymentMethod: 'paystack',
                    paymentStatus: 'completed',
                    paymentDate: new Date(),
                    paystackReference: event.data.reference,
                    metadata: event.data
                });
    
                // Calculate new balance
                const newBalanceAmount = payment.balanceAmount - paidAmount;
                payment.balanceAmount = newBalanceAmount;
                payment.paidAmount += paidAmount;
    
                // Update payment status
                if (newBalanceAmount <= 0) {
                    payment.paymentStatus = 'paid';
                } else {
                    payment.paymentStatus = 'partially_paid';
                }
    
                await payment.save();
    
                // Create finance record
                const financeRecord = new Finance({
                    transactionType: 'income',
                    category: 'sales',
                    amount: paidAmount,
                    description: `Payment received for sale #${payment.sale._id} from ${payment.customer.name}`,
                    referenceId: payment._id,
                    referenceModel: 'Payment',
                    metadata: {
                        paystackReference: event.data.reference,
                        paymentId: payment._id,
                        saleId: payment.sale._id,
                    }
                });
                await financeRecord.save();
    
                // Send confirmation emails
                const messageHtml = generatePaymentSuccessMessage(
                    payment.customer,
                    payment.sale,
                    payment,
                    product,
                    event.data.reference
                );
    
                // Send to customer
                await sendEmail(
                    payment.customer.email,
                    `Payment Confirmation - Order #${payment.sale._id}`,
                    messageHtml
                );
    
                // Send to business
                await sendEmail(
                    process.env.BUSINESS_EMAIL,
                    'Payment Received',
                    generateBusinessPaymentNotification(payment, event.data)
                );
            }
    
            // Handle failed charges
            else if (event.event === 'charge.failed') {
                const { paymentId, customerId } = event.data.metadata;
                
                const payment = await Payment.findById(paymentId)
                    .populate('customer')
                    .populate('sale');
    
                if (payment) {
                    payment.paymentHistory.push({
                        amount: event.data.amount / 100,
                        paymentMethod: 'paystack',
                        paymentStatus: 'failed',
                        paymentDate: new Date(),
                        paystackReference: event.data.reference,
                        metadata: event.data
                    });
    
                    await payment.save();
    
                    // Send failure notification
                    await sendEmail(
                        payment.customer.email,
                        `Payment Failed - Order #${payment.sale._id}`,
                        generatePaymentFailureMessage(payment, event.data)
                    );
                }
            }
    
            res.sendStatus(200);
        } catch (error) {
            console.error('Webhook error:', error);
            res.sendStatus(500);
        }
    },

    // Generate profit/loss report
    async generateReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Get all completed payments in date range
            const payments = await Payment.find({
                'paymentHistory.paymentDate': { $gte: start, $lte: end },
            }).populate({
                path: 'sale',
                populate: { path: 'productId' }
            });

            // Calculate totals
            const report = {
                totalRevenue: 0,
                totalCost: 0,
                profit: 0,
                paymentMethods: {
                    cash: 0,
                    momo: 0,
                    card: 0,
                    paystack: 0
                },
                completedPayments: 0,
                partialPayments: 0,
                pendingPayments: 0
            };

            payments.forEach(payment => {
                const completedPayments = payment.paymentHistory.filter(p => 
                    p.paymentDate >= start && 
                    p.paymentDate <= end
                );

                completedPayments.forEach(p => {
                    report.totalRevenue += p.amount;
                    report.paymentMethods[p.paymentMethod] += p.amount;
                });

                if (payment.sale && payment.sale.productId) {
                    report.totalCost += payment.sale.productId.unitPrice * payment.sale.quantitySold;
                }
            });

            report.profit = report.totalRevenue - report.totalCost;

            // Get payment status counts
            const statusCounts = await Payment.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            statusCounts.forEach(({ _id, count }) => {
                if (_id === 'completed') report.completedPayments = count;
                if (_id === 'partially_paid') report.partialPayments = count;
                if (_id === 'pending') report.pendingPayments = count;
            });

            res.json(report);
        } catch (error) {
            console.error('Error generating report:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Download sales report
    async downloadSalesReport(req, res) {
        const { startDate, endDate ,format = 'csv'} = req.query;

        if (!startDate || !endDate) {
            return res.status(400).send('Start date and end date are required.');
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
            res.status(500).send('Internal Server Error');
        }
    }
};

module.exports = PaymentController;