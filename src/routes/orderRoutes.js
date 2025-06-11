// src/routes/orderRoutes.js
// Define as rotas da API para a gestão de pedidos.

const express = require('express');
const {
    handleCreateOrder,
    handleGetOrderDetails,
    handleAddItemToOrder,
    handleRemoveItemFromOrder,
    handleUpdateOrderStatus,
    handleProcessPayment,
} = require('../controllers/orderController');

const router = express.Router();

// --- Rotas de Pedidos ---

// Criar um novo pedido
// POST /api/v1/orders
router.post('/', handleCreateOrder);

// Obter detalhes de um pedido específico
// GET /api/v1/orders/:orderId
router.get('/:orderId', handleGetOrderDetails);

// Adicionar um item a um pedido
// POST /api/v1/orders/:orderId/items
router.post('/:orderId/items', handleAddItemToOrder);

// Remover um item de um pedido
// DELETE /api/v1/orders/:orderId/items/:orderItemId
router.delete('/:orderId/items/:orderItemId', handleRemoveItemFromOrder);

// Atualizar o status de um pedido
// PATCH /api/v1/orders/:orderId/status 
// Usamos PATCH aqui pois é uma atualização parcial do recurso
router.patch('/:orderId/status', handleUpdateOrderStatus);

// Processar o pagamento de um pedido
// POST /api/v1/orders/:orderId/payment
router.post('/:orderId/payment', handleProcessPayment);


module.exports = router;