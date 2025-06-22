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

/**
 * NOVA FUNÇÃO
 * Lida com a requisição para obter produtos com preços específicos para um cliente.
 */
async function handleGetProductsForCustomer(req, res) {
    try {
        const { customerId } = req.params;
        const products = productService.getProductsForCustomer(customerId);
        res.status(200).json({ products });
    } catch (err) {
        console.error('Erro no handleGetProductsForCustomer:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar produtos do cliente.' });
    }
}

module.exports = {
    handleGetInitialData, handleGetProductsForCustomer,
};