// src/services/orderService.js
const db = require('../../database/database');
const crypto = require('crypto');
const ledgerService = require('./ledgerService');

function getOrderDetails(orderId) {
    const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
    if (!order) return null;
    const items = db.prepare(`SELECT oi.*, p.name as product_name, p.unit_of_measure FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?`).all(orderId);
    const payments = db.prepare('SELECT * FROM order_payments WHERE order_id = ? ORDER BY paid_at').all(orderId);
    return { ...order, items, payments };
}

function searchOrdersById(partialId) {
    const sql = `SELECT o.order_id, o.execution_status, o.payment_status, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.order_id LIKE ? ORDER BY o.created_at DESC LIMIT 10`;
    return db.prepare(sql).all(`${partialId.toUpperCase()}%`);
}

function getOrdersByCustomer(customerId) {
    const sql = `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC`;
    return db.prepare(sql).all(customerId);
}

const saveOrder = db.transaction((orderData) => {
    const { order_id, customer_id, execution_status, pickup_datetime, completed_at, paid_at, items, payments = [] } = orderData;
    
    const totalAmount = items ? items.reduce((sum, item) => sum + Math.round((item.unit_price || 0) * (item.quantity || 0)), 0) : 0;
    
    const totalToPayWithBalance = payments
        .filter(p => p.method.toUpperCase() === 'SALDO')
        .reduce((sum, p) => sum + p.amount, 0);

    // Chama a nova função 'syncSaleTransactionForOrder' do ledgerService
    if (totalToPayWithBalance > 0 || payments.some(p => p.method.toUpperCase() === 'SALDO')) {
        ledgerService.syncSaleTransactionForOrder(customer_id, order_id, totalToPayWithBalance);
    }
    
    const existingOrder = db.prepare('SELECT order_id FROM orders WHERE order_id = ?').get(order_id);
    if (!existingOrder) {
        const createSql = `INSERT INTO orders (order_id, customer_id, execution_status, payment_status, total_amount, pickup_datetime, completed_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.prepare(createSql).run(order_id, customer_id, execution_status, 'AGUARDANDO_PAGAMENTO', totalAmount, pickup_datetime, completed_at, paid_at);
    } else {
        const updateSql = `UPDATE orders SET customer_id = ?, execution_status = ?, total_amount = ?, pickup_datetime = ?, completed_at = ?, paid_at = ? WHERE order_id = ?`;
        db.prepare(updateSql).run(customer_id, execution_status, totalAmount, pickup_datetime, completed_at, paid_at, order_id);
    }

    // 3. Sincroniza os itens do pedido
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order_id);
    if (items && items.length > 0) {
        const itemInsert = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`);
        for (const item of items) {
            itemInsert.run(order_id, item.product_id, item.quantity, item.unit_price, Math.round(item.unit_price * item.quantity));
        }
    }

    db.prepare('DELETE FROM order_payments WHERE order_id = ?').run(order_id);
    const paymentInsert = db.prepare(`INSERT INTO order_payments (payment_id, order_id, method, amount, paid_at) VALUES (?, ?, ?, ?, ?)`);

    if (payments && payments.length > 0) {
        for (const payment of payments) {
            const paymentId = crypto.randomUUID();
            paymentInsert.run(paymentId, order_id, payment.method.toUpperCase(), payment.amount, payment.paid_at);
        }
    }
    
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    let newPaymentStatus = 'AGUARDANDO_PAGAMENTO';
    if (totalPaid > 0) {
        newPaymentStatus = totalPaid >= totalAmount ? 'PAGO' : 'PAGO_PARCIALMENTE';
    }
    db.prepare('UPDATE orders SET payment_status = ? WHERE order_id = ?').run(newPaymentStatus, order_id);
    
    return getOrderDetails(order_id);
});

module.exports = { saveOrder, getOrderDetails, searchOrdersById, getOrdersByCustomer };