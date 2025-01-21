const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { isLoggedIn } = require('../utils/auth');

// Create a new transaction
router.post('/create', isLoggedIn, financeController.createTransaction);

// Get all transactions with pagination and filtering
router.get('/list', isLoggedIn, financeController.getAllTransactions);

// Get finance statistics
router.get('/stats', isLoggedIn, financeController.getFinanceStats);

// Export finance data
router.get('/export', isLoggedIn, financeController.exportFinance);

// Update a transaction
router.put('/:id', isLoggedIn, financeController.updateTransaction);

// Delete a transaction
router.delete('/:id', isLoggedIn, financeController.deleteTransaction);

module.exports = router;
