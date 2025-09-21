// src/controllers/orderController.js
const orderService = require('../services/orderService');
const { scheduleTaskSchema } = require('../utils/validationSchemas');


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

async function handleGetDailyOrders(req, res) {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
        }
        const orders = orderService.getDailyAggregatedOrders(start_date, end_date);
        res.status(200).json(orders);
    } catch (err) {
        console.error("Erro em handleGetDailyOrders:", err);
        res.status(500).json({ message: 'Erro interno ao buscar dados diários.' });
    }
}

async function handleScheduleTask(req, res) {
    try {
        // NOVO: Bloco de validação
        const { error, value } = scheduleTaskSchema.validate(req.body);
        if (error) {
            // Se a validação falhar, retorna um erro 400 claro para o frontend.
            return res.status(400).json({ message: 'Dados de agendamento inválidos.', details: error.details.map(d => d.message).join(', ') });
        }

        // Se a validação passar, continua com os valores validados.
        const { order_id, task_type, schedule_date } = value;
        await orderService.scheduleTask(order_id, task_type, schedule_date);
        res.status(200).json({ message: 'Tarefa agendada com sucesso.' });
    } catch (err) {
        console.error("Erro em handleScheduleTask:", err);
        res.status(500).json({ message: err.message });
    }
}

async function handleCancelSchedule(req, res) {
    try {
        const { order_id, task_type } = req.body;
        await orderService.cancelSchedule(order_id, task_type);
        res.status(200).json({ message: 'Agendamento cancelado com sucesso.' });
    } catch (err) {
        console.error("Erro em handleCancelSchedule:", err);
        res.status(500).json({ message: err.message });
    }
}

async function handleUpdateStatus(req, res) {
    try {
        const { order_id, status_field, status_value } = req.body;
        await orderService.updateOrderStatus(order_id, status_field, status_value);
        res.status(200).json({ message: 'Status atualizado com sucesso.' });
    } catch (err) {
        console.error("Erro em handleUpdateStatus:", err);
        res.status(500).json({ message: err.message });
    }
}

// ATUALIZE SEU MODULE.EXPORTS PARA INCLUIR AS NOVAS FUNÇÕES
module.exports = {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
    handleGetCustomerOrders,
    handleGetDailyOrders,
    handleScheduleTask,
    handleCancelSchedule,
    handleUpdateStatus,
};