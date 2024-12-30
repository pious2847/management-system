const express = require('express');
const MaterialsController = require('../controllers/materials.controller')
const router = express.Router();

router.get('/', (req, res) =>{
    res.status(200).json({ message: 'Welcome to the Materials Management System API!' });
})

router.post('/materials/save', MaterialsController.createMaterial );
router.get('/materials/details/:id', MaterialsController.getMaterialsDetails)
router.post('/materials/update/:id', MaterialsController.updateMaterial);
router.post('/materials/restock/:id', MaterialsController.reStockMaterials);
router.get('/materials/delete/:id', MaterialsController.deleteMaterial);

module.exports = router