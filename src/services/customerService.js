// src/services/customerService.js
const db = require('../../database/database');
const crypto = require('crypto');

/**
 * Busca clientes cujo nome corresponda parcialmente ao termo de busca.
 * @param {string} name - O termo de busca para o nome.
 * @returns {Array<object>} Uma lista de clientes correspondentes.
 */
function findCustomersByName(name) {
    try {
        const sql = "SELECT customer_id, name, phone FROM customers WHERE name LIKE ? COLLATE NOCASE LIMIT 10";
        return db.prepare(sql).all(`%${name}%`);
    } catch (err) {
        console.error("Erro ao buscar clientes por nome:", err);
        throw new Error("Falha ao buscar clientes.");
    }
}

/**
 * Busca os detalhes completos de um cliente, incluindo seu saldo.
 * @param {string} customerId - O ID do cliente.
 * @returns {object|null} - Objeto com detalhes e saldo, ou null se não encontrado.
 */
function getCustomerDetailsById(customerId) {
    const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
    if (!customer) return null;

    // A lógica de cálculo de saldo foi movida para o ledgerService para centralização
    const ledgerService = require('./ledgerService'); // Importação local para evitar dependência circular
    const balance = ledgerService.getCustomerBalance(customerId);
    
    return { details: customer, balance };
}

/**
 * Cria um novo cliente no banco de dados.
 * @param {object} customerData - { name, phone, email, address }
 * @returns {object} O cliente recém-criado.
 */
function createCustomer(customerData) {
    const customerId = crypto.randomUUID();
    const { name, phone, email, address } = customerData;
    const sql = `INSERT INTO customers (customer_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
    db.prepare(sql).run(customerId, name, phone, email, address);
    return { customer_id: customerId, ...customerData };
}


module.exports = {
    findCustomersByName,
    getCustomerDetailsById,
    createCustomer,
};