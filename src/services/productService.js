// src/services/productService.js
const db = require('../../database/database');

function getAllProducts() {
    try {
        const stmt = db.prepare(`SELECT * FROM products ORDER BY category, name`);
        return stmt.all();
    } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        throw new Error('Falha ao buscar produtos do banco de dados.');
    }
}

function getCategories() {
    try {
        const stmt = db.prepare(`SELECT DISTINCT category FROM products ORDER BY category`);
        return stmt.all().map(row => row.category);
    } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        throw new Error('Falha ao buscar categorias do banco de dados.');
    }
}

/**
 * NOVA FUNÇÃO
 * Busca todos os produtos, mas substitui o preço pelo preço específico do cliente, se existir.
 */
function getProductsForCustomer(customerId) {
    try {
        const sql = `
            SELECT
                p.product_id,
                p.name,
                p.category,
                p.unit_of_measure,
                -- Usa o preço específico do cliente, se existir; senão, usa o preço padrão do produto.
                COALESCE(cp.price, p.price) as price
            FROM
                products p
            LEFT JOIN
                customer_prices cp ON p.product_id = cp.product_id AND cp.customer_id = ?
            ORDER BY
                p.category, p.name;
        `;
        const stmt = db.prepare(sql);
        return stmt.all(customerId);
    } catch (err) {
        console.error('Erro ao buscar produtos para o cliente:', err);
        throw new Error('Falha ao buscar produtos para o cliente.');
    }
}

module.exports = {
    getAllProducts,
    getCategories,
    getProductsForCustomer, // Exporta a nova função
};