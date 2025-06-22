// src/routes/customerRoutes.js
const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController'); // Importe o productController

const router = express.Router();

// Rotas de Cliente existentes
router.post('/', customerController.handleCreateCustomer);
router.get('/search', customerController.handleSearchCustomers);
router.get('/:customerId/details', customerController.handleGetCustomerDetails);
router.patch('/:customerId', customerController.handleUpdateCustomer);
router.get('/:customerId/orders', orderController.handleGetCustomerOrders);
router.post('/:customerId/credits', customerController.handleAddCredit);
router.post('/:customerId/packages', customerController.handleAddPackage);

// NOVAS ROTAS PARA PREÇOS ESPECÍFICOS
router.get('/:customerId/products', productController.handleGetProductsForCustomer);
router.post('/:customerId/prices', customerController.handleUpdateCustomerPrices);

module.exports = router;