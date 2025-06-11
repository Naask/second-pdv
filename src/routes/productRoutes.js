// src/routes/productRoutes.js
// Define as rotas da API relacionadas a produtos.

const express = require('express');
const { handleGetInitialData } = require('../controllers/productController');

const router = express.Router();

// Rota para obter os dados iniciais necessários para o PDV (produtos e categorias)
// GET /api/v1/products/initial-data
router.get('/initial-data', handleGetInitialData);

module.exports = router;