const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { isLoggedIn } = require('../utils/auth');

// Create a new sale
router.post('/create', isLoggedIn, salesController.createSale);

// Get all sales with pagination and filtering
router.get('/list', isLoggedIn, salesController.getAllSales);

// Get sales statistics
router.get('/stats', isLoggedIn, salesController.getSalesStats);

// Export sales data
router.get('/export', isLoggedIn, salesController.exportSales);

// Update a sale
router.put('/:id', isLoggedIn, salesController.updateSale);

// Delete a sale
router.delete('/:id', isLoggedIn, salesController.deleteSale);

module.exports = router;
