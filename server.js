// server.js - Ponto de Entrada da Aplicação
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importação das rotas da aplicação
const customerRoutes = require('./src/routes/customerRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes'); // NOVA LINHA

require('./database/database');

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 250, // Limite um pouco maior para acomodar mais interações
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições enviadas deste IP, por favor tente novamente após 15 minutos.',
});
app.use('/api/', apiLimiter);

// Servir Arquivos Estáticos (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes); // NOVA LINHA

// Rota Principal e Tratamento de 404
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint não encontrado.' });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
    console.log(`Acesse o PDV em http://localhost:${PORT}`);
});