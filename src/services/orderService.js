// src/services/orderService.js
// Lida com a lógica de negócios para criar e gerenciar pedidos.

const db = require('../../database/database');
const crypto = require('crypto');
const ledgerService = require('./ledgerService'); // Importamos o ledger para registrar transações!
const { customAlphabet } = require('nanoid');

// DEFINIÇÃO DO NOSSO GERADOR DE ID CUSTOMIZADO
// Usamos um alfabeto sem caracteres ambíguos (como 0/O, 1/I/l)
// E definimos o tamanho para 8 caracteres.
const generateOrderId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

/**
 * Cria um novo pedido vazio para um cliente.
 * @param {string} customerId - O ID do cliente para o qual o pedido está sendo criado.
 * @returns {object} O objeto do pedido recém-criado.
 */
/**
 * Cria um novo pedido vazio para um cliente com um ID curto e aleatório.
 * @param {string} customerId - O ID do cliente.
 * @returns {object} O objeto do pedido recém-criado com seu ID customizado.
 */
function createOrder(customerId) {
    // Geramos nosso novo ID curto e aleatório. Ex: '4B3D-A9P1'
    const orderId = generateOrderId();
    
    const sql = `
        INSERT INTO orders (order_id, customer_id, status) 
        VALUES (?, ?, 'EM_ABERTO')
    `;
    
    // Inserimos o novo pedido com nosso ID gerado.
    db.prepare(sql).run(orderId, customerId);
    
    // Buscamos e retornamos o pedido completo.
    return getOrderDetails(orderId);
}

/**
 * Busca pedidos cujo ID comece com o termo de busca.
 * @param {string} partialId - O início do ID do pedido a ser buscado.
 * @returns {Array<object>} Uma lista de pedidos correspondentes, incluindo o nome do cliente.
 */
function searchOrdersById(partialId) {
    try {
        const sql = `
            SELECT 
                o.order_id,
                o.status,
                c.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id LIKE ? 
            ORDER BY o.created_at DESC
            LIMIT 10
        `;
        // O '%' é um curinga que diz "qualquer coisa depois do termo de busca"
        const orders = db.prepare(sql).all(`${partialId}%`);
        return orders;
    } catch (err) {
        console.error('Erro ao buscar pedidos por ID parcial:', err);
        throw new Error('Falha ao buscar pedidos.');
    }
}


/**
 * Adiciona um item a um pedido existente.
 * Esta é uma operação transacional para garantir a consistência dos dados.
 * @param {string} orderId - O ID do pedido.
 * @param {number} productId - O ID do produto a ser adicionado.
 * @param {number} quantity - A quantidade (pode ser float para KG).
 * @returns {object} O estado atualizado do pedido.
 */
const addItemToOrder = db.transaction((orderId, productId, quantity) => {
    // 1. Buscar o preço do produto
    const product = db.prepare('SELECT price FROM products WHERE product_id = ?').get(productId);
    if (!product) {
        throw new Error('Produto não encontrado.');
    }
    const unitPrice = product.price;
    const totalPrice = Math.round(unitPrice * quantity); // Arredonda para o centavo mais próximo

    // 2. Inserir o novo item na tabela 'order_items'
    const insertItemSql = `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.prepare(insertItemSql).run(orderId, productId, quantity, unitPrice, totalPrice);

    // 3. Atualizar o valor total na tabela 'orders'
    const updateTotalSql = `
        UPDATE orders 
        SET total_amount = total_amount + ? 
        WHERE order_id = ?
    `;
    db.prepare(updateTotalSql).run(totalPrice, orderId);

    return { success: true };
});

/**
 * Remove um item de um pedido.
 * Também é uma operação transacional.
 * @param {number} orderItemId - O ID do item do pedido a ser removido.
 * @returns {object} O estado atualizado do pedido.
 */
const removeItemFromOrder = db.transaction((orderItemId) => {
    // 1. Obter o item para saber seu preço e o order_id
    const item = db.prepare('SELECT order_id, total_price FROM order_items WHERE order_item_id = ?').get(orderItemId);
    if (!item) {
        throw new Error('Item do pedido não encontrado.');
    }

    // 2. Remover o item da tabela 'order_items'
    db.prepare('DELETE FROM order_items WHERE order_item_id = ?').run(orderItemId);

    // 3. Atualizar (subtrair) o valor total na tabela 'orders'
    const updateTotalSql = `
        UPDATE orders
        SET total_amount = total_amount - ?
        WHERE order_id = ?
    `;
    db.prepare(updateTotalSql).run(item.total_price, item.order_id);
    
    return { success: true };
});

/**
 * Busca os detalhes completos de um pedido, incluindo seus itens.
 * @param {string} orderId - O ID do pedido.
 * @returns {object|null} - Um objeto com os dados do pedido e uma lista de itens, ou null se não for encontrado.
 */
function getOrderDetails(orderId) {
    const orderSql = 'SELECT * FROM orders WHERE order_id = ?';
    const order = db.prepare(orderSql).get(orderId);

    if (!order) {
        return null;
    }

    const itemsSql = `
        SELECT oi.*, p.name as product_name 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = ?
    `;
    const items = db.prepare(itemsSql).all(orderId);

    return { ...order, items };
}

/**
 * Atualiza o status de um pedido.
 * @param {string} orderId - O ID do pedido.
 * @param {string} status - O novo status (ex: 'AGUARDANDO_PAGAMENTO').
 * @returns {object} - O pedido atualizado.
 */
function updateOrderStatus(orderId, status) {
    const sql = "UPDATE orders SET status = ? WHERE order_id = ?";
    db.prepare(sql).run(status, orderId);
    return getOrderDetails(orderId);
}

/**
 * Finaliza a venda e realiza o pagamento com o saldo do cliente.
 * Conecta a operação de pedido ao ledger financeiro.
 * @param {string} orderId - O ID do pedido a ser pago.
 * @returns {object} - Status da operação.
 */
const processPaymentWithBalance = db.transaction((orderId) => {
    const order = getOrderDetails(orderId);
    if (!order) throw new Error('Pedido não encontrado para processar pagamento.');

    const customerBalance = ledgerService.getCustomerBalance(order.customer_id);

    if (customerBalance.totalBalance < order.total_amount) {
        throw new Error('Saldo insuficiente para cobrir o valor total do pedido.');
    }

    // 1. Lança a VENDA no ledger (dívida para o cliente)
    ledgerService.recordTransaction({
        customerId: order.customer_id,
        type: 'SALE',
        amount: order.total_amount,
        description: `Referente ao Pedido #${order.order_id.substring(0, 8)}`,
        metadata: { orderId: order.order_id }
    });
    
    // 2. Lança o PAGAMENTO no ledger (cliente quita a dívida com seu saldo)
    ledgerService.recordTransaction({
        customerId: order.customer_id,
        type: 'PAYMENT_RECEIVED',
        amount: order.total_amount,
        description: `Pagamento do Pedido #${order.order_id.substring(0, 8)} com saldo`,
        metadata: { orderId: order.order_id, paymentMethod: 'BALANCE' }
    });

    // 3. Atualiza o status do pedido para 'PAGO'
    updateOrderStatus(order.order_id, 'PAGO');

    return { success: true, message: 'Pedido pago com sucesso utilizando o saldo.' };
});


module.exports = {
    createOrder,
    addItemToOrder,
    removeItemFromOrder,
    getOrderDetails,
    updateOrderStatus,
    processPaymentWithBalance,
    searchOrdersById,
};