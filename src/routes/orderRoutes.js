// src/routes/orderRoutes.js
const express = require('express');

// A CORREÇÃO ESTÁ AQUI: Adicionamos 'handleGenerateBarcode' à lista de importação
const {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
    handleGetCustomerOrders, // Adicionei esta, pois também estava faltando na sua versão
    handleGenerateBarcode,
} = require('../controllers/orderController');

const router = express.Router();

// Rota principal para salvar (criar ou atualizar) um pedido
router.post('/save', handleSaveOrder);

// Rota para buscar pedidos por ID parcial
router.get('/search', handleSearchOrders);

// Rota para gerar uma imagem de código de barras
router.get('/barcode/:text', handleGenerateBarcode);

// Rota para obter detalhes de um pedido específico
router.get('/:orderId', handleGetOrderDetails);

// Rota para obter todos os pedidos de um cliente (agora importada corretamente)
// Esta rota estava no customerRoutes, mas faz mais sentido aqui ou no customerRoutes,
// dependendo da sua preferência de organização. Vamos mantê-la como referência.
// Se a rota estiver em `customerRoutes.js`, você pode remover esta linha.
// router.get('/by-customer/:customerId', handleGetCustomerOrders);


module.exports = router;