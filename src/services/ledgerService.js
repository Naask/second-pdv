// src/services/ledgerService.js
const db = require('../../database/database');
const crypto = require('crypto');

function getCustomerBalance(customerId) {
    const transactions = db.prepare(`SELECT transaction_type, amount FROM ledger_transactions WHERE customer_id = ?`).all(customerId);
    let mainBalance = 0;
    let bonusBalance = 0;
    for (const t of transactions) {
        switch (t.transaction_type) {
            case 'PAYMENT_RECEIVED': mainBalance += t.amount; break;
            case 'BONUS_ADDED': bonusBalance += t.amount; break;
            case 'BALANCE_CORRECTION_CREDIT': mainBalance += t.amount; break;
            case 'BALANCE_CORRECTION_DEBIT': mainBalance -= t.amount; break;
            case 'SALE':
                 const saleAmount = t.amount;
                 const bonusUsed = Math.min(bonusBalance, saleAmount);
                 bonusBalance -= bonusUsed;
                 mainBalance -= (saleAmount - bonusUsed);
                 break;
        }
    }
    return { mainBalance, bonusBalance, totalBalance: mainBalance + bonusBalance };
}

function recordTransaction({ customerId, type, amount, description, metadata = {} }) {
    const transactionId = crypto.randomUUID();
    const sql = `INSERT INTO ledger_transactions (transaction_id, customer_id, transaction_type, description, amount, metadata) VALUES (?, ?, ?, ?, ?, ?)`;
    db.prepare(sql).run(transactionId, customerId, type, description, amount, JSON.stringify(metadata));
    return { success: true, transaction_id: transactionId };
}

/**
 * Sincroniza o valor de uma venda no ledger de forma idempotente.
 * Ela calcula o que já foi debitado para um pedido e aplica apenas a diferença.
 */
function syncSaleTransactionForOrder(customerId, orderId, newTotalToPayWithBalance) {
    const rows = db.prepare(`
        SELECT amount, transaction_type FROM ledger_transactions 
        WHERE metadata LIKE ? AND (transaction_type = 'SALE' OR transaction_type LIKE 'BALANCE_CORRECTION%')
    `).all(`%"orderId":"${orderId}"%`);
    
    const alreadyDebited = rows.reduce((sum, row) => {
        if (row.transaction_type === 'SALE' || row.transaction_type === 'BALANCE_CORRECTION_DEBIT') {
            return sum + row.amount;
        }
        if (row.transaction_type === 'BALANCE_CORRECTION_CREDIT') {
            return sum - row.amount;
        }
        return sum;
    }, 0);

    const difference = newTotalToPayWithBalance - alreadyDebited;

    if (difference === 0) {
        return { success: true, message: 'Nenhum ajuste de saldo necessário.' };
    }

    const balance = getCustomerBalance(customerId);
    if (difference > 0 && balance.totalBalance < difference) {
        throw new Error("Saldo insuficiente para cobrir o pagamento.");
    }

    if (difference > 0) {
        recordTransaction({ customerId, type: 'SALE', amount: difference, description: `Pagamento/Ajuste Pedido #${orderId}`, metadata: { orderId } });
    } else {
        recordTransaction({ customerId, type: 'BALANCE_CORRECTION_CREDIT', amount: -difference, description: `Estorno/Ajuste Pedido #${orderId}`, metadata: { orderId } });
    }

    return { success: true };
}

const addPrepaidPackage = db.transaction(({ customerId, paidAmount, bonusAmount }) => {
    recordTransaction({ customerId, type: 'PAYMENT_RECEIVED', amount: paidAmount, description: `Pacote pré-pago` });
    if (bonusAmount > 0) {
        recordTransaction({ customerId, type: 'BONUS_ADDED', amount: bonusAmount, description: `Bônus referente à compra do pacote` });
    }
    return { success: true };
});

module.exports = {
    getCustomerBalance,
    recordTransaction,
    addPrepaidPackage,
    syncSaleTransactionForOrder, // Exporta a nova função
};