const express = require('express');
const router = express.Router();

const userController = require('../controllers/users.controller')

router.post('/users/save', userController.createUser)
router.get('/users/details/:userId', userController.getUserById)
router.post('/users/update/:id', userController.updateUser);
router.get('/users/delete/:id', userController.deleteUser);


module.exports = router