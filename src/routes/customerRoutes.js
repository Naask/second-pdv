// src/routes/customerRoutes.js
const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/', customerController.handleCreateCustomer);
router.get('/search', customerController.handleSearchCustomers);
router.get('/:customerId/details', customerController.handleGetCustomerDetails);
router.patch('/:customerId', customerController.handleUpdateCustomer);
router.get('/:customerId/orders', orderController.handleGetCustomerOrders);

// --- NOVAS ROTAS ---
router.post('/:customerId/credits', customerController.handleAddCredit);
router.post('/:customerId/packages', customerController.handleAddPackage);

module.exports = router;