// server.js - Ponto de Entrada da Aplicação
// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importação dos módulos necessários
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importação das rotas da aplicação
const customerRoutes = require('./src/routes/customerRoutes');

// Importação do módulo de banco de dados para garantir a inicialização
require('./database/database');

// Inicialização da aplicação Express
const app = express();

// --- Configuração dos Middlewares ---

// Habilita o CORS para permitir requisições de diferentes origens (essencial para o frontend)
app.use(cors());

// Define headers de segurança HTTP para proteger a aplicação de vulnerabilidades conhecidas
app.use(helmet());

// Habilita o parsing de requisições com corpo em formato JSON
app.use(express.json());

// Limita a taxa de requisições para a API para prevenir ataques de força bruta/DoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 requisições por janela
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições enviadas deste IP, por favor tente novamente após 15 minutos.',
});
app.use('/api/', apiLimiter);

// --- Servir Arquivos Estáticos (Frontend) ---

// Serve os arquivos da pasta 'public' (index.html, css, js)
app.use(express.static(path.join(__dirname, 'public')));


// --- Rotas da API ---

// Agrupa todas as rotas de clientes sob o prefixo /api/v1/customers
app.use('/api/v1/customers', customerRoutes);


// --- Rota Principal e Tratamento de 404 ---

// Rota para a página principal (caso o acesso seja direto à raiz)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para tratar rotas não encontradas (404)
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint não encontrado.' });
});

// --- Inicialização do Servidor ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
    console.log(`Acesse o PDV em http://localhost:${PORT}`);
});