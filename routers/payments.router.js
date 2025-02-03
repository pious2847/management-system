const express = require('express')
const router = express.Router()

const PaymentController = require("../controllers/payments.controller");

router.post('/payments', PaymentController.createPayment);
router.post('/payments/paystack/initialize', PaymentController.initializePaystackPayment);
router.post('/payments/paystack/webhook', PaymentController.paystackWebhook);
router.get('/payments/report', PaymentController.generateReport);

module.exports = router