const db = require('../../database/database');

function getOrderDetails(orderId) {
    const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
    if (!order) return null;
    const items = db.prepare(`SELECT oi.*, p.name as product_name, p.unit_of_measure FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?`).all(orderId);
    return { ...order, items };
}

function searchOrdersById(partialId) {
    try {
        const sql = `SELECT o.order_id, o.execution_status, o.payment_status, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.order_id LIKE ? ORDER BY o.created_at DESC LIMIT 10`;
        return db.prepare(sql).all(`${partialId.toUpperCase()}%`);
    } catch (err) {
        console.error('Erro ao buscar pedidos por ID parcial:', err);
        throw new Error('Falha ao buscar pedidos.');
    }
}

function getOrdersByCustomer(customerId) {
    try {
        const sql = `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC`;
        return db.prepare(sql).all(customerId);
    } catch (err) {
        console.error('Erro ao buscar pedidos do cliente:', err);
        throw new Error('Falha ao buscar os pedidos do cliente.');
    }
}

const saveOrder = db.transaction((orderData) => {
    const { order_id, customer_id, execution_status, payment_status, pickup_datetime, completed_at, paid_at, items } = orderData;
    const totalAmount = items ? items.reduce((sum, item) => sum + Math.round((item.unit_price || 0) * (item.quantity || 0)), 0) : 0;
    const existingOrder = db.prepare('SELECT order_id FROM orders WHERE order_id = ?').get(order_id);

    if (!existingOrder) {
        const createSql = `INSERT INTO orders (order_id, customer_id, execution_status, payment_status, pickup_datetime, completed_at, paid_at, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.prepare(createSql).run(order_id, customer_id, execution_status, payment_status, pickup_datetime, completed_at, paid_at, totalAmount);
    } else {
        const updateSql = `UPDATE orders SET customer_id = ?, execution_status = ?, payment_status = ?, pickup_datetime = ?, completed_at = ?, paid_at = ?, total_amount = ? WHERE order_id = ?`;
        db.prepare(updateSql).run(customer_id, execution_status, payment_status, pickup_datetime, completed_at, paid_at, totalAmount, order_id);
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

module.exports = { saveOrder, getOrderDetails, searchOrdersById, getOrdersByCustomer };