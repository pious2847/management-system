const express = require('express');

const router = express.Router();

router.get('/', (req, res) =>{
    res.status(200).json({ message: 'Welcome to the Materials Management System API!' });
})
module.exports = router