// src/routes/orderRoutes.js
const express = require('express');
const {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
} = require('../controllers/orderController');

const router = express.Router();

// Rota principal para salvar (criar ou atualizar) um pedido
router.post('/save', handleSaveOrder);

// Rotas para buscar pedidos
router.get('/search', handleSearchOrders);
router.get('/:orderId', handleGetOrderDetails);

module.exports = router;