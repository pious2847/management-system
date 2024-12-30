
const express = require('express');
const router = express.Router();
const pageRender = require('../controllers/pagerender')

// GET home page
router.get('/', pageRender.getDashboard)
router.get('/dashboard/materials', pageRender.getMaterials)
router.get('/dashboard/supplies', pageRender.getSupplies)
router.get('/dashboard/low-stock', pageRender.getLowStockMaterials)
router.get('/dashboard/users', pageRender.getUsers)


module.exports = router