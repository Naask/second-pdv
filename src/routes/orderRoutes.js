// src/routes/orderRoutes.js
const express = require('express');
const {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
    handleProcessPayment,
    handleGetCustomerOrders, // Adicionado para consistência, embora chamado via customerRoutes
} = require('../controllers/orderController');

const router = express.Router();

// Rota para salvar (criar ou atualizar) um pedido
router.post('/save', handleSaveOrder);

// Rota para buscar pedidos por ID parcial
router.get('/search', handleSearchOrders);

// Rota para obter detalhes de um pedido específico
router.get('/:orderId', handleGetOrderDetails);

// Rota para processar um pagamento (era usada no fluxo de pagamento anterior, pode ser removida se não usada)
// Mantendo por consistência, caso queiramos um botão de pagamento direto no futuro.
// A lógica de pagamento principal agora está no saveOrder.
// router.post('/:orderId/pay', handleProcessPayment); 

module.exports = router;