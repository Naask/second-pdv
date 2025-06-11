// src/controllers/productController.js
// Lida com as requisições HTTP relacionadas a produtos.

const productService = require('../services/productService');

/**
 * Lida com a requisição para obter todos os produtos e todas as categorias.
 * É uma rota de "inicialização" para o frontend carregar os dados necessários.
 * @param {object} req - O objeto de requisição do Express.
 * @param {object} res - O objeto de resposta do Express.
 */
async function handleGetInitialData(req, res) {
    try {
        // Chama as duas funções do nosso serviço em paralelo
        const products = productService.getAllProducts();
        const categories = productService.getCategories();

        // Envia uma resposta única com ambos os conjuntos de dados
        res.status(200).json({
            products,
            categories,
        });

    } catch (err) {
        console.error('Erro no handleGetInitialData:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar dados iniciais.' });
    }
}

module.exports = {
    handleGetInitialData,
};