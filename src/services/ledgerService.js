// src/services/ledgerService.js
const db = require('../../database/database');
const crypto = require('crypto');

function getCustomerBalance(customerId) {
    const transactions = db.prepare(`SELECT transaction_type, amount FROM ledger_transactions WHERE customer_id = ?`).all(customerId);
    let mainBalance = 0;
    let bonusBalance = 0;

    for (const t of transactions) {
        switch (t.transaction_type) {
            case 'PAYMENT_RECEIVED':
            case 'BALANCE_CORRECTION_CREDIT':
                mainBalance += t.amount;
                break;
            case 'SALE':
                mainBalance -= t.amount;
                break;
            case 'BONUS_ADDED':
                bonusBalance += t.amount;
                break;
        }
    }
    return { mainBalance, bonusBalance, totalBalance: mainBalance + bonusBalance };
}

function recordTransaction({ customerId, type, amount, description, metadata = {} }) {
    const sql = `INSERT INTO ledger_transactions (transaction_id, customer_id, transaction_type, description, amount, metadata) VALUES (?, ?, ?, ?, ?, ?)`;
    db.prepare(sql).run(
        crypto.randomUUID(),
        customerId,
        type,
        description,
        amount,
        JSON.stringify(metadata)
    );
    return { success: true };
}

const addPrepaidPackage = db.transaction(({ customerId, paidAmount, bonusAmount }) => {
    const formatCurrency = (amount) => `R$ ${(amount / 100).toFixed(2)}`;

    recordTransaction({
        customerId,
        type: 'PAYMENT_RECEIVED',
        amount: paidAmount,
        description: `Compra de pacote pré-pago no valor de ${formatCurrency(paidAmount)}`,
        metadata: { "package_value": paidAmount, "bonus_value": bonusAmount }
    });

    if (bonusAmount > 0) {
        recordTransaction({
            customerId,
            type: 'BONUS_ADDED',
            amount: bonusAmount,
            description: `Bônus de ${formatCurrency(bonusAmount)} referente ao pacote`,
            metadata: { "package_value": paidAmount, "bonus_value": bonusAmount }
        });
    }
    return { success: true };
});

module.exports = {
    getCustomerBalance,
    recordTransaction,
    addPrepaidPackage,
};