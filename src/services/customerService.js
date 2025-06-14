const db = require('../../database/database');
const crypto = require('crypto');
const ledgerService = require('./ledgerService');

function findCustomersByName(name) {
    try {
        const sql = "SELECT customer_id, name, phone FROM customers WHERE name LIKE ? COLLATE NOCASE LIMIT 10";
        return db.prepare(sql).all(`%${name}%`);
    } catch (err) {
        console.error("Erro ao buscar clientes por nome:", err);
        throw new Error("Falha ao buscar clientes.");
    }
}

function getCustomerDetailsById(customerId) {
    const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
    if (!customer) return null;
    const balance = ledgerService.getCustomerBalance(customerId);
    return { details: customer, balance };
}

function createCustomer(customerData) {
    const customerId = crypto.randomUUID();
    const { name, phone, email, address } = customerData;
    const sql = `INSERT INTO customers (customer_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
    db.prepare(sql).run(customerId, name, phone, email, address);
    return { customer_id: customerId, ...customerData };
}

module.exports = { findCustomersByName, getCustomerDetailsById, createCustomer };