// src/routes/customerRoutes.js
const express = require('express');
const customerController = require('../controllers/customerController');
// Importamos ambos os controladores pois esta rota de cliente usa uma função do controlador de pedidos
const orderController = require('../controllers/orderController');

const router = express.Router();

// --- Rotas de Clientes ---

// Criar um novo cliente
router.post('/', customerController.handleCreateCustomer);

// Buscar clientes por nome
router.get('/search', customerController.handleSearchCustomers);

// Obter os detalhes de um cliente específico (dados, saldo)
router.get('/:customerId/details', customerController.handleGetCustomerDetails);

// Obter todos os pedidos de um cliente específico
// GET /api/v1/customers/:customerId/orders
router.get('/:customerId/orders', orderController.handleGetCustomerOrders);

router.patch('/:customerId', customerController.handleUpdateCustomer);


module.exports = router;