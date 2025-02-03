const Payment = require('../models/payments');
const Sales = require('../models/sales');
const Finance = require('../models/finance');
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    // Add your email configuration here
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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

            // Send email with payment link
            await transporter.sendMail({
                to: email,
                subject: 'Payment Authorization Required',
                html: `
                    <h2>Payment Authorization Required</h2>
                    <p>Please click the link below to complete your payment:</p>
                    <p><a href="${response.data.authorization_url}">Complete Payment</a></p>
                    <p>Amount: ${amount}</p>
                `
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
            const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (hash !== req.headers['x-paystack-signature']) {
                throw new Error('Invalid signature');
            }

            const event = req.body;

            if (event.event === 'charge.success') {
                const { paymentId } = event.data.metadata;
                const payment = await Payment.findById(paymentId);

                if (!payment) {
                    throw new Error('Payment not found');
                }

                // Add payment to history
                payment.paymentHistory.push({
                    amount: event.data.amount / 100,
                    paymentMethod: 'paystack',
                    status: 'completed',
                    paystackReference: event.data.reference,
                    metadata: event.data
                });

                await payment.save();

                // Create finance record
                await Finance.create({
                    transactionType: 'income',
                    category: 'sales',
                    amount: event.data.amount / 100,
                    description: `Payment received from ${payment.customer.name}`,
                    referenceId: payment._id,
                    referenceModel: 'Payment'
                });

                // Send notification email to business
                await transporter.sendMail({
                    to: process.env.BUSINESS_EMAIL,
                    subject: 'Payment Received',
                    html: `
                        <h2>Payment Received</h2>
                        <p>Customer: ${payment.customer.name}</p>
                        <p>Amount: ${event.data.amount / 100}</p>
                        <p>Reference: ${event.data.reference}</p>
                    `
                });
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
                'paymentHistory.status': 'completed'
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
                    p.status === 'completed' && 
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
    }
};

module.exports = PaymentController;