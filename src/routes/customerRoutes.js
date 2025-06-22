// src/routes/customerRoutes.js
const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');

const router = express.Router();

// Rotas de Cliente
router.post('/', customerController.handleCreateCustomer);
router.get('/search', customerController.handleSearchCustomers);
router.get('/:customerId/details', customerController.handleGetCustomerDetails);
router.patch('/:customerId', customerController.handleUpdateCustomer);
router.post('/:customerId/packages', customerController.handleAddPackage);

// ROTA CORRETA para buscar os pedidos do cliente
router.get('/:customerId/orders', orderController.handleGetCustomerOrders);

// Rotas para preços específicos
router.get('/:customerId/products', productController.handleGetProductsForCustomer);
router.post('/:customerId/prices', customerController.handleUpdateCustomerPrices);

module.exports = router;