// src/services/orderService.js
const db = require('../../database/database');

// As funções de busca não mudam
function getOrderDetails(orderId) {
    const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
    if (!order) return null;
    const items = db.prepare(`SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?`).all(orderId);
    return { ...order, items };
}

/**
 * Busca todos os pedidos de um cliente específico.
 * @param {string} customerId - O ID do cliente.
 * @returns {Array<object>} Uma lista de pedidos do cliente.
 */
function getOrdersByCustomer(customerId) {
    try {
        const sql = `
            SELECT * FROM orders 
            WHERE customer_id = ? 
            ORDER BY created_at DESC
        `;
        return db.prepare(sql).all(customerId);
    } catch (err) {
        console.error('Erro ao buscar pedidos do cliente:', err);
        throw new Error('Falha ao buscar os pedidos do cliente.');
    }
}

function searchOrdersById(partialId) {
    try {
        const sql = `
            SELECT 
                o.order_id,
                o.execution_status,
                o.payment_status,
                c.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id LIKE ? 
            ORDER BY o.created_at DESC
            LIMIT 10
        `;
        return db.prepare(sql).all(`${partialId.toUpperCase()}%`);
    } catch (err) {
        console.error('Erro ao buscar pedidos por ID parcial:', err);
        throw new Error('Falha ao buscar pedidos.');
    }
}

/**
 * Função central e transacional para salvar um pedido (cria ou atualiza).
 * @param {object} orderData - O objeto completo do pedido vindo do frontend.
 */
const saveOrder = db.transaction((orderData) => {
    const {
        order_id,
        customer_id,
        execution_status,
        payment_status,
        pickup_datetime,
        items
    } = orderData;

    const totalAmount = items ? items.reduce((sum, item) => sum + Math.round((item.unit_price || 0) * (item.quantity || 0)), 0) : 0;
    const existingOrder = db.prepare('SELECT order_id FROM orders WHERE order_id = ?').get(order_id);

    if (!existingOrder) {
        const createSql = `INSERT INTO orders (order_id, customer_id, execution_status, payment_status, pickup_datetime, total_amount) VALUES (?, ?, ?, ?, ?, ?)`;
        db.prepare(createSql).run(order_id, customer_id, execution_status, payment_status, pickup_datetime, totalAmount);
    } else {
        const updateSql = `UPDATE orders SET customer_id = ?, execution_status = ?, payment_status = ?, pickup_datetime = ?, total_amount = ? WHERE order_id = ?`;
        db.prepare(updateSql).run(customer_id, execution_status, payment_status, pickup_datetime, totalAmount, order_id);
    }

    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order_id);

    if (items && items.length > 0) {
        const itemInsert = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`);
        for (const item of items) {
            const itemTotalPrice = Math.round((item.unit_price || 0) * (item.quantity || 0));
            itemInsert.run(order_id, item.product_id, item.quantity, item.unit_price, itemTotalPrice);
        }
    }
    
    return getOrderDetails(order_id);
});


module.exports = {
    saveOrder,
    getOrderDetails,
    getOrdersByCustomer,
    searchOrdersById,
};