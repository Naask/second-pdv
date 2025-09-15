require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const customerRoutes = require('./src/routes/customerRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const planningRoutes = require('./src/routes/planningRoutes');

require('./database/database');

const app = express();

app.use(cors());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "cdn.jsdelivr.net"],
    },
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/planning', planningRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/planning', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planning.html'));
});

app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint não encontrado.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
    console.log(`Acesse o PDV em http://localhost:${PORT}`);
    console.log(`Acesse o Planejamento em http://localhost:${PORT}/planning`);
});