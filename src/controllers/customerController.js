// src/controllers/customerController.js
const customerService = require('../services/customerService');
const { createCustomerSchema } = require('../utils/validationSchemas');

async function handleCreateCustomer(req, res) {
    try {
        const { error, value } = createCustomerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: 'Dados inválidos.', details: error.details.map(d => d.message).join(', ') });
        }
        const newCustomer = customerService.createCustomer(value);
        res.status(201).json(newCustomer);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno ao criar cliente.' });
    }
}

async function handleSearchCustomers(req, res) {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ message: 'O parâmetro de busca "name" é obrigatório.' });
        }
        const customers = customerService.findCustomersByName(name);
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno ao buscar clientes.' });
    }
}

async function handleGetCustomerDetails(req, res) {
    try {
        const { customerId } = req.params;
        const customerDetails = customerService.getCustomerDetailsById(customerId);
        if (!customerDetails) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        res.status(200).json(customerDetails);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do cliente.' });
    }
}


module.exports = {
    handleCreateCustomer,
    handleSearchCustomers,
    handleGetCustomerDetails,
};