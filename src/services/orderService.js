// src/services/orderService.js
const db = require('../../database/database');
const crypto = require('crypto');
const ledgerService = require('./ledgerService');

function getOrderDetails(orderId) {
    const order = db.prepare('SELECT *, planned_wash_datetime, actual_wash_datetime, planned_iron_datetime, actual_iron_datetime FROM orders WHERE order_id = ?').get(orderId);
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
    const {
        order_id,
        customer_id,
        execution_status,
        pickup_datetime,
        completed_at,
        paid_at,
        created_at,
        items,
        payments = [],
        planned_wash_datetime,
        actual_wash_datetime,
        planned_iron_datetime,
        actual_iron_datetime
    } = orderData;
    
    const totalAmount = items ? items.reduce((sum, item) => sum + Math.round((item.unit_price || 0) * (item.quantity || 0)), 0) : 0;
    
    const totalToPayWithBalance = payments
        .filter(p => p.method.toUpperCase() === 'SALDO')
        .reduce((sum, p) => sum + p.amount, 0);

    if (totalToPayWithBalance > 0 || payments.some(p => p.method.toUpperCase() === 'SALDO')) {
        ledgerService.syncSaleTransactionForOrder(customer_id, order_id, totalToPayWithBalance);
    }
    
    const existingOrder = db.prepare('SELECT order_id FROM orders WHERE order_id = ?').get(order_id);

    if (!existingOrder) {
        const createSql = `INSERT INTO orders (order_id, customer_id, execution_status, payment_status, total_amount, pickup_datetime, completed_at, paid_at, planned_wash_datetime, actual_wash_datetime, planned_iron_datetime, actual_iron_datetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.prepare(createSql).run(order_id, customer_id, execution_status, 'AGUARDANDO_PAGAMENTO', totalAmount, pickup_datetime, completed_at, paid_at, planned_wash_datetime, actual_wash_datetime, planned_iron_datetime, actual_iron_datetime);
    } else {
        const updateSql = `UPDATE orders SET customer_id = ?, execution_status = ?, total_amount = ?, pickup_datetime = ?, completed_at = ?, paid_at = ?, created_at = ?, planned_wash_datetime = ?, actual_wash_datetime = ?, planned_iron_datetime = ?, actual_iron_datetime = ? WHERE order_id = ?`;
        db.prepare(updateSql).run(customer_id, execution_status, totalAmount, pickup_datetime, completed_at, paid_at, created_at, planned_wash_datetime, actual_wash_datetime, planned_iron_datetime, actual_iron_datetime, order_id);
    }

    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order_id);
    if (items && items.length > 0) {
        const itemInsert = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`);
        for (const item of items) {
            itemInsert.run(order_id, item.product_id, item.quantity, item.unit_price, Math.round(item.unit_price * item.quantity));
        }
    }

    db.prepare('DELETE FROM order_payments WHERE order_id = ?').run(order_id);
    if (payments && payments.length > 0) {
        const paymentInsert = db.prepare(`INSERT INTO order_payments (payment_id, order_id, method, amount, paid_at) VALUES (?, ?, ?, ?, ?)`);
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



// ADICIONE ESTAS NOVAS FUNÇÕES AO ARQUIVO orderService.js

// SUBSTITUA A FUNÇÃO getDailyAggregatedOrders EXISTENTE POR ESTA VERSÃO CORRIGIDA

function getDailyAggregatedOrders(startDate, endDate) {
    const sql = `
        SELECT
            date(o.pickup_datetime) as date,
            json_group_array(
                json_object(
                    'order_id', o.order_id,
                    'customer_name', c.name,
                    'total_amount', o.total_amount,
                    'pickup_datetime', o.pickup_datetime,
                    'planned_wash_datetime', o.planned_wash_datetime,
                    'planned_iron_datetime', o.planned_iron_datetime,
                    -- Verifica se a data atual existe para determinar o estado
                    'is_washed', CASE WHEN o.actual_wash_datetime IS NOT NULL THEN 1 ELSE 0 END,
                    'is_passed', CASE WHEN o.actual_iron_datetime IS NOT NULL THEN 1 ELSE 0 END,
                    'is_packed', 0 -- Coluna 'is_packed' não existe, então definimos como 0 por defeito
                )
            ) as orders,
            SUM(o.total_amount) as total_value
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE date(o.pickup_datetime) BETWEEN date(?) AND date(?)
        GROUP BY date(o.pickup_datetime)
        ORDER BY date;
    `;
    const rows = db.prepare(sql).all(startDate, endDate);
    // O SQLite retorna o JSON como uma string, por isso precisamos de o converter
    return rows.map(row => ({
        ...row,
        orders: JSON.parse(row.orders)
    }));
}

function scheduleTask(orderId, taskType, scheduleDate) {
    const fieldMap = {
        'wash': 'planned_wash_datetime',
        'pass': 'planned_iron_datetime' // Corrigido de 'iron' para 'pass'
    };
    const fieldName = fieldMap[taskType];
    if (!fieldName) throw new Error('Tipo de tarefa inválido.');

    const sql = `UPDATE orders SET ${fieldName} = ? WHERE order_id = ?`;
    const info = db.prepare(sql).run(scheduleDate, orderId);
    if (info.changes === 0) throw new Error('Pedido não encontrado.');
}

function cancelSchedule(orderId, taskType) {
    // Reutiliza a função de agendamento para definir a data como nula
    return scheduleTask(orderId, taskType, null);
}

function updateOrderStatus(orderId, statusField, statusValue) {
    const fieldMap = {
        'is_washed': 'actual_wash_datetime',
        'is_passed': 'actual_iron_datetime'
        // 'is_packed' pode ser adicionado aqui se criar a coluna no futuro
    };

    const dbField = fieldMap[statusField];
    if (!dbField) {
        throw new Error('Campo de estado inválido.');
    }

    // Se o novo valor for 'true', define a data atual. Se for 'false', define como NULL.
    const dbValue = statusValue ? new Date().toISOString() : null;

    const sql = `UPDATE orders SET ${dbField} = ? WHERE order_id = ?`;
    const info = db.prepare(sql).run(dbValue, orderId);
    if (info.changes === 0) throw new Error('Pedido não encontrado.');
}


// ATUALIZE SEU MODULE.EXPORTS PARA INCLUIR AS NOVAS FUNÇÕES
module.exports = {
    saveOrder,
    getOrderDetails,
    searchOrdersById,
    getOrdersByCustomer,
    getDailyAggregatedOrders,
    scheduleTask,
    cancelSchedule,
    updateOrderStatus,
};