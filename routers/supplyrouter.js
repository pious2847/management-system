const express = require('express');
const SuppliesController = require('../controllers/supplies.controller');
const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Supplies Management System API!' });
});

// router.get('/dashboard/supplies', SuppliesController.getAllSupplies);
router.post('/supplies/save', SuppliesController.createSupply);
router.get('/supplies/details/:id', SuppliesController.getSuppliesDetails);
router.post('/supplies/update/:id', SuppliesController.updateSupply);
router.get('/supplies/delete/:id', SuppliesController.deleteSupply);

module.exports = router;