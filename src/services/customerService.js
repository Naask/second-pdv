// src/services/customerService.js
const db = require('../../database/database');
const crypto = require('crypto');

function findCustomersByName(name) {
    return db.prepare("SELECT customer_id, name, phone FROM customers WHERE name LIKE ? COLLATE NOCASE LIMIT 10").all(`%${name}%`);
}

function getCustomerDetailsById(customerId) {
    const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
    if (!customer) return null;
    const ledgerService = require('./ledgerService'); 
    const balance = ledgerService.getCustomerBalance(customerId);
    return { details: customer, balance };
}

function createCustomer(customerData) {
    const customerId = crypto.randomUUID();
    const { name, phone, email, address } = customerData;
    db.prepare(`INSERT INTO customers (customer_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`).run(customerId, name, phone, email, address);
    return { customer_id: customerId, ...customerData };
}

function updateCustomer(customerId, customerData) {
    const { name, phone, email, address } = customerData;
    const info = db.prepare(`UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE customer_id = ?`).run(name, phone, email, address, customerId);
    if (info.changes === 0) throw new Error("Cliente não encontrado ou nenhum dado foi alterado.");
    return getCustomerDetailsById(customerId);
}

// --- NOVAS FUNÇÕES QUE CHAMAM O LEDGER ---
function addCreditToCustomer(customerId, { amount, description }) {
    const ledgerService = require('./ledgerService');
    return ledgerService.recordTransaction({
        customerId,
        type: 'PAYMENT_RECEIVED',
        amount,
        description: description || 'Crédito adicionado manualmente'
    });
}

function addPackageToCustomer(customerId, { paidAmount, bonusAmount }) {
    const ledgerService = require('./ledgerService');
    return ledgerService.addPrepaidPackage({ customerId, paidAmount, bonusAmount });
}

/**
 * NOVA FUNÇÃO
 * Atualiza a tabela de preços de um cliente.
 */
const updateCustomerPrices = db.transaction((customerId, prices) => {
    // 1. Apaga todos os preços antigos daquele cliente
    db.prepare("DELETE FROM customer_prices WHERE customer_id = ?").run(customerId);

    // 2. Insere os novos preços especiais que foram enviados
    const insertStmt = db.prepare("INSERT INTO customer_prices (customer_id, product_id, price) VALUES (?, ?, ?)");
    for (const priceEntry of prices) {
        // Apenas insere se um preço foi de fato fornecido
        if (priceEntry.price !== null && priceEntry.price !== '') {
            insertStmt.run(customerId, priceEntry.product_id, priceEntry.price);
        }
    }
    return { success: true, message: 'Tabela de preços atualizada.' };
});


module.exports = {
    findCustomersByName,
    getCustomerDetailsById,
    createCustomer,
    updateCustomer,
    addCreditToCustomer,
    addPackageToCustomer,
    updateCustomerPrices,
};