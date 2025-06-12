// src/controllers/orderController.js
// Lida com as requisições HTTP para a gestão de pedidos.

const orderService = require('../services/orderService');

/**
 * Lida com a criação de um novo pedido para um cliente.
 */
async function handleCreateOrder(req, res) {
    try {
        const { customerId } = req.body;
        if (!customerId) {
            return res.status(400).json({ message: 'O ID do cliente (customerId) é obrigatório.' });
        }
        const newOrder = orderService.createOrder(customerId);
        res.status(201).json(newOrder);
    } catch (err) {
        console.error('Erro em handleCreateOrder:', err);
        res.status(500).json({ message: 'Erro interno ao criar o pedido.' });
    }
}

async function handleSearchOrders(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'O parâmetro de busca "id" é obrigatório.' });
        }
        const orders = orderService.searchOrdersById(id);
        res.status(200).json(orders);
    } catch (err) {
        console.error('Erro em handleSearchOrders:', err);
        res.status(500).json({ message: 'Erro interno ao buscar pedidos.' });
    }
}

/**
 * Lida com a busca dos detalhes de um pedido específico.
 */
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

/**
 * Lida com a adição de um item a um pedido.
 */
async function handleAddItemToOrder(req, res) {
    try {
        const { orderId } = req.params;
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'ID do produto (productId) e quantidade (quantity) são obrigatórios e a quantidade deve ser positiva.' });
        }
        
        orderService.addItemToOrder(orderId, productId, quantity);
        const updatedOrder = orderService.getOrderDetails(orderId); // Retorna o pedido atualizado
        res.status(200).json(updatedOrder);

    } catch (err) {
        console.error('Erro em handleAddItemToOrder:', err);
        res.status(500).json({ message: err.message || 'Erro interno ao adicionar item ao pedido.' });
    }
}

/**
 * Lida com a remoção de um item de um pedido.
 */
async function handleRemoveItemFromOrder(req, res) {
    try {
        const { orderItemId } = req.params;
        if (!orderItemId) {
            return res.status(400).json({ message: 'O ID do item do pedido (orderItemId) é obrigatório.' });
        }

        orderService.removeItemFromOrder(orderItemId);
        res.status(200).json({ message: 'Item removido com sucesso.' });

    } catch (err) {
        console.error('Erro em handleRemoveItemFromOrder:', err);
        res.status(500).json({ message: err.message || 'Erro interno ao remover o item.' });
    }
}

/**
 * Lida com a atualização do status de um pedido.
 */
async function handleUpdateOrderStatus(req, res) {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'O novo status é obrigatório.' });
        }
        const updatedOrder = orderService.updateOrderStatus(orderId, status);
        res.status(200).json(updatedOrder);
    } catch (err) {
        console.error('Erro em handleUpdateOrderStatus:', err);
        res.status(500).json({ message: 'Erro interno ao atualizar o status do pedido.' });
    }
}

/**
 * Lida com o processamento do pagamento de um pedido usando o saldo do cliente.
 */
async function handleProcessPayment(req, res) {
    try {
        const { orderId } = req.params;
        const result = orderService.processPaymentWithBalance(orderId);
        res.status(200).json(result);
    } catch (err) {
        console.error('Erro em handleProcessPayment:', err);
        // Envia a mensagem de erro específica do serviço (ex: "Saldo insuficiente")
        res.status(400).json({ message: err.message });
    }
}


module.exports = {
    handleCreateOrder,
    handleGetOrderDetails,
    handleAddItemToOrder,
    handleRemoveItemFromOrder,
    handleUpdateOrderStatus,
    handleProcessPayment,
    handleSearchOrders,
};