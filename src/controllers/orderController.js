// src/controllers/orderController.js
const orderService = require('../services/orderService');

async function handleSaveOrder(req, res) {
    try {
        const orderData = req.body;
        if (!orderData || !orderData.order_id || !orderData.customer_id) {
            return res.status(400).json({ message: 'Dados do pedido incompletos.' });
        }
        const savedOrder = orderService.saveOrder(orderData);
        res.status(200).json(savedOrder);
    } catch (err) {
        console.error("Erro em handleSaveOrder:", err);
        res.status(500).json({ message: err.message || 'Erro interno ao salvar o pedido.' });
    }
}

async function handleGetOrderDetails(req, res) {
    try {
        const { orderId } = req.params;
        const orderDetails = orderService.getOrderDetails(orderId);
        if (!orderDetails) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json(orderDetails);
    } catch (err) {
        console.error('Erro em handleGetOrderDetails:', err);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do pedido.' });
    }
}

async function handleSearchOrders(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(200).json([]);
        }
        const orders = orderService.searchOrdersById(id);
        res.status(200).json(orders);
    } catch (err) {
        console.error('Erro em handleSearchOrders:', err);
        res.status(500).json({ message: 'Erro interno ao buscar pedidos.' });
    }
}

async function handleGetCustomerOrders(req, res) {
    try {
        const { customerId } = req.params;
        const orders = orderService.getOrdersByCustomer(customerId);
        res.status(200).json(orders);
    } catch (err) {
        console.error("Erro em handleGetCustomerOrders:", err);
        res.status(500).json({ message: 'Erro interno ao buscar os pedidos do cliente.' });
    }
}


module.exports = {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
    handleGetCustomerOrders,
};