// src/routes/orderRoutes.js
const express = require('express');
const {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
} = require('../controllers/orderController');

const router = express.Router();

// Rota principal para salvar (criar ou atualizar) um pedido
// POST /api/v1/orders/save
router.post('/save', handleSaveOrder);

// Rota para buscar pedidos por ID parcial
// GET /api/v1/orders/search?id=...
router.get('/search', handleSearchOrders);

// Rota para obter detalhes de um pedido específico
// GET /api/v1/orders/:orderId
router.get('/:orderId', handleGetOrderDetails);

module.exports = router;