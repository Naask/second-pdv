// src/controllers/customerController.js
const customerService = require('../services/customerService'); // ÚNICA DEPENDÊNCIA DE SERVIÇO
const { createCustomerSchema } = require('../utils/validationSchemas');

async function handleSearchCustomers(req, res) {
    try {
        const customers = customerService.findCustomersByName(req.query.name || '');
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno ao buscar clientes.' });
    }
}

async function handleGetCustomerDetails(req, res) {
    try {
        const customerDetails = customerService.getCustomerDetailsById(req.params.customerId);
        if (!customerDetails) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.status(200).json(customerDetails);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do cliente.' });
    }
}

async function handleCreateCustomer(req, res) { /* ... (sem alterações) ... */ }
async function handleUpdateCustomer(req, res) { /* ... (sem alterações) ... */ }

// Handlers de crédito e pacote agora chamam o customerService
async function handleAddCredit(req, res) {
    try {
        customerService.addCreditToCustomer(req.params.customerId, req.body);
        res.status(201).json({ message: 'Crédito adicionado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function handleAddPackage(req, res) {
    try {
        customerService.addPackageToCustomer(req.params.customerId, req.body);
        res.status(201).json({ message: 'Pacote adicionado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

module.exports = {
    handleSearchCustomers,
    handleGetCustomerDetails,
    handleCreateCustomer,
    handleUpdateCustomer,
    handleAddCredit,
    handleAddPackage,
};