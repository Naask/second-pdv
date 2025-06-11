// src/routes/customerRoutes.js
const express = require('express');
const {
    handleCreateCustomer,
    handleSearchCustomers,
    handleGetCustomerDetails,
    handleRecordPrepaidPackage
} = require('../controllers/customerController');

const router = express.Router();

// --- Definição das Rotas para Clientes e Operações Financeiras ---

// Rota para criar um novo cliente
// POST /api/v1/customers
router.post('/', handleCreateCustomer);

// Rota para buscar clientes por nome
// GET /api/v1/customers/search?name=...
router.get('/search', handleSearchCustomers);

// Rota para obter os detalhes completos de um cliente específico (dados, saldo, extrato)
// GET /api/v1/customers/:customerId/details
router.get('/:customerId/details', handleGetCustomerDetails);

// Rota para adicionar um pacote pré-pago (crédito + bônus) a um cliente
// POST /api/v1/customers/:customerId/packages
router.post('/:customerId/packages', handleRecordPrepaidPackage);

// Futuramente, outras rotas podem ser adicionadas aqui
// Ex: router.post('/:customerId/sales', handleRecordSale);
// Ex: router.post('/:customerId/discounts', handleApplyDiscount);

module.exports = router;