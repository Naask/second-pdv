// src/controllers/orderController.js
const orderService = require('../services/orderService');
const bwipjs = require('bwip-js'); // ADICIONADO: Importa a biblioteca de código de barras


async function handleSaveOrder(req, res) {
    try {
        const orderData = req.body;
        if (!orderData || !orderData.order_id || !orderData.customer_id) {
            return res.status(400).json({ message: 'Dados do pedido incompletos.' });
        }
        const savedOrder = orderService.saveOrder(orderData);
        res.status(200).json(savedOrder);
    } catch (err) {
        console.error("Erro em handleSaveOrder:", err);
        res.status(500).json({ message: err.message || 'Erro interno ao salvar o pedido.' });
    }
}

async function handleGetOrderDetails(req, res) {
    try {
        const { orderId } = req.params;
        const orderDetails = orderService.getOrderDetails(orderId);
        if (!orderDetails) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json(orderDetails);
    } catch (err) {
        console.error('Erro em handleGetOrderDetails:', err);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do pedido.' });
    }
}

async function handleSearchOrders(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(200).json([]);
        }
        const orders = orderService.searchOrdersById(id);
        res.status(200).json(orders);
    } catch (err) {
        console.error('Erro em handleSearchOrders:', err);
        res.status(500).json({ message: 'Erro interno ao buscar pedidos.' });
    }
}

async function handleGetCustomerOrders(req, res) {
    try {
        const { customerId } = req.params;
        const orders = orderService.getOrdersByCustomer(customerId);
        res.status(200).json(orders);
    } catch (err) {
        console.error("Erro em handleGetCustomerOrders:", err);
        res.status(500).json({ message: 'Erro interno ao buscar os pedidos do cliente.' });
    }
}

/**
 * NOVA FUNÇÃO
 * Gera uma imagem PNG de código de barras a partir de um texto.
 */
async function handleGenerateBarcode(req, res) {
    try {
        const textToEncode = req.params.text;

        // Gera o código de barras como uma imagem PNG
        bwipjs.toBuffer({
            bcid: 'code128',       // Tipo do código de barras
            text: textToEncode,    // Texto a ser codificado
            scale: 2,              // Escala da imagem
            height: 5,            // Altura em mm
            paddingwidth: 5,       // Adiciona um pequeno padding horizontal (em pixels)
            paddingleft: 5,        // Adiciona um padding à esquerda (zona de silêncio inicial)
            includetext: true,     // Inclui o texto abaixo do código
            textxalign: 'center',  // Alinhamento do texto
            fontsize: 10           // Reduzindo o tamanho da fonte do texto
        }, (err, png) => {
            if (err) {
                console.error("Erro no bwip-js:", err);
                return res.status(500).json({ message: 'Erro ao gerar código de barras.' });
            }
            
            // Envia a imagem PNG como resposta
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(png);
        });

    } catch (err) {
        console.error("Erro em handleGenerateBarcode:", err);
        res.status(500).json({ message: 'Erro interno ao gerar a imagem.' });
    }
}

module.exports = {
    handleSaveOrder,
    handleGetOrderDetails,
    handleSearchOrders,
    handleGetCustomerOrders,
    handleGenerateBarcode, // Verifique se esta linha existe
};