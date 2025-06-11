// src/services/ledgerService.js
const db = require('../../database/database');
const crypto = require('crypto');

/**
 * Calcula os saldos principal e de bônus de um cliente.
 * @param {string} customerId - O ID do cliente.
 * @returns {object} - Um objeto contendo { mainBalance, bonusBalance, totalBalance }.
 */
function getCustomerBalance(customerId) {
    const sql = `
        SELECT
            transaction_type,
            amount
        FROM ledger_transactions
        WHERE customer_id = ?
    `;
    const transactions = db.prepare(sql).all(customerId);

    let mainBalance = 0;
    let bonusBalance = 0;

    for (const t of transactions) {
        switch (t.transaction_type) {
            case 'PAYMENT_RECEIVED':
            case 'BALANCE_CORRECTION_CREDIT':
                mainBalance += t.amount;
                break;
            case 'SALE':
            case 'BALANCE_CORRECTION_DEBIT':
                mainBalance -= t.amount;
                break;
            case 'BONUS_ADDED':
                bonusBalance += t.amount;
                break;
            case 'DISCOUNT_APPLIED':
                bonusBalance -= t.amount;
                break;
        }
    }
    
    return {
        mainBalance,
        bonusBalance,
        totalBalance: mainBalance + bonusBalance,
    };
}

/**
 * Retorna o extrato completo (ledger) de um cliente.
 * @param {string} customerId - O ID do cliente.
 * @returns {Array} - Uma lista de todas as transações, ordenadas pela data.
 */
function getCustomerLedger(customerId) {
    const sql = `
        SELECT transaction_id, timestamp, transaction_type, description, amount, metadata
        FROM ledger_transactions
        WHERE customer_id = ?
        ORDER BY timestamp DESC
    `;
    return db.prepare(sql).all(customerId);
}

/**
 * Cria um novo cliente no banco de dados.
 * @param {object} customerData - { name, phone, email, address }
 * @returns {object} - O cliente recém-criado com seu ID.
 */
function createCustomer(customerData) {
    const customerId = crypto.randomUUID();
    const { name, phone, email, address } = customerData;

    const sql = `
        INSERT INTO customers (customer_id, name, phone, email, address)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.prepare(sql).run(customerId, name, phone, email, address);

    return { customer_id: customerId, ...customerData };
}

/**
 * Busca clientes por nome.
 * @param {string} name - O termo de busca para o nome.
 * @returns {Array} - Uma lista de clientes que correspondem à busca.
 */
function findCustomersByName(name) {
    const sql = "SELECT customer_id, name, phone FROM customers WHERE name LIKE ? LIMIT 10";
    return db.prepare(sql).all(`%${name}%`);
}

/**
 * Obtém os detalhes de um único cliente pelo seu ID.
 * @param {string} customerId - O ID do cliente.
 * @returns {object} - Os dados do cliente.
 */
function getCustomerById(customerId) {
    const sql = "SELECT * FROM customers WHERE customer_id = ?";
    return db.prepare(sql).get(customerId);
}

/**
 * Função transacional para registrar a compra de um pacote pré-pago.
 * Garante que tanto o pagamento quanto o bônus sejam registrados, ou nenhum deles.
 * @param {string} customerId - O ID do cliente.
 * @param {number} paidAmount - O valor pago (em centavos).
 * @param {number} bonusAmount - O valor do bônus (em centavos).
 */
const recordPrepaidPackage = db.transaction((customerId, paidAmount, bonusAmount) => {
    const paymentSql = `
        INSERT INTO ledger_transactions (transaction_id, customer_id, transaction_type, description, amount, metadata)
        VALUES (?, ?, 'PAYMENT_RECEIVED', ?, ?, ?)
    `;
    db.prepare(paymentSql).run(
        crypto.randomUUID(),
        customerId,
        `Compra de pacote de crédito pré-pago`,
        paidAmount,
        JSON.stringify({ operation: 'prepaid_package' })
    );

    const bonusSql = `
        INSERT INTO ledger_transactions (transaction_id, customer_id, transaction_type, description, amount, metadata)
        VALUES (?, ?, 'BONUS_ADDED', ?, ?, ?)
    `;
    db.prepare(bonusSql).run(
        crypto.randomUUID(),
        customerId,
        `Bônus referente à compra do pacote de R$ ${(paidAmount / 100).toFixed(2)}`,
        bonusAmount,
        JSON.stringify({ operation: 'prepaid_package_bonus' })
    );

    return { success: true };
});


// Exporta todas as funções públicas do serviço
module.exports = {
    getCustomerBalance,
    getCustomerLedger,
    createCustomer,
    findCustomersByName,
    getCustomerById,
    recordPrepaidPackage
};