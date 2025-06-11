// src/services/productService.js
// Este serviço lida com todas as operações relacionadas a produtos.

const db = require('../../database/database');

/**
 * Busca todos os produtos do banco de dados.
 * @returns {Array<object>} Uma lista de todos os produtos, ordenados por categoria e nome.
 */
function getAllProducts() {
    try {
        const stmt = db.prepare(`
            SELECT 
                product_id,
                name,
                price,
                category,
                unit_of_measure 
            FROM products 
            ORDER BY category, name
        `);
        const products = stmt.all();
        return products;
    } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        throw new Error('Falha ao buscar produtos do banco de dados.');
    }
}

/**
 * Busca todas as categorias distintas de produtos.
 * @returns {Array<string>} Uma lista de nomes de categorias.
 */
function getCategories() {
    try {
        const stmt = db.prepare(`
            SELECT DISTINCT category 
            FROM products 
            ORDER BY category
        `);
        // O método .all() retorna um array de objetos (ex: [{ category: 'PESO' }]).
        // Usamos .map() para extrair apenas a string do nome da categoria.
        const categories = stmt.all().map(row => row.category);
        return categories;
    } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        throw new Error('Falha ao buscar categorias do banco de dados.');
    }
}

module.exports = {
    getAllProducts,
    getCategories,
};