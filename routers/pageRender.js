
const express = require('express');
const router = express.Router();
const pageRender = require('../controllers/pagerender');
const { isLoggedIn } = require('../utils/auth');

// GET home page
router.get('/', pageRender.getLogin)
router.get('/dashboard', isLoggedIn, pageRender.getDashboard)
router.get('/dashboard/materials',isLoggedIn, pageRender.getMaterials)
router.get('/dashboard/supplies', isLoggedIn,pageRender.getSupplies)
router.get('/dashboard/low-stock', isLoggedIn,pageRender.getLowStockMaterials)
router.get('/dashboard/users', isLoggedIn,pageRender.getUsers)


module.exports = router