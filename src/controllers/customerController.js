// src/controllers/customerController.js
const customerService = require('../services/customerService');
const ledgerService = require('../services/ledgerService');
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
        console.error("Erro em handleCreateCustomer:", err);
        res.status(500).json({ message: 'Erro interno ao criar cliente.' });
    }
}

async function handleSearchCustomers(req, res) {
    try {
        const { name } = req.query;
        const customers = customerService.findCustomersByName(name || '');
        res.status(200).json(customers);
    } catch (err) {
        console.error("Erro em handleSearchCustomers:", err);
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
        console.error("Erro em handleGetCustomerDetails:", err);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do cliente.' });
    }
}

async function handleUpdateCustomer(req, res) {
    try {
        const { customerId } = req.params;
        const updatedCustomer = customerService.updateCustomer(customerId, req.body);
        res.status(200).json(updatedCustomer);
    } catch (err) {
        console.error("Erro em handleUpdateCustomer:", err);
        res.status(500).json({ message: err.message });
    }
}

async function handleAddCredit(req, res) {
    try {
        const { customerId } = req.params;
        const { amount, description } = req.body;
        if (!amount || !Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({ message: "O valor deve ser um número inteiro e positivo." });
        }
        // Chamando a função correta que agora está no customerService
        customerService.addCreditToCustomer(customerId, { amount, description });
        res.status(201).json({ message: 'Crédito adicionado com sucesso.' });
    } catch (err) {
        console.error("Erro em handleAddCredit:", err);
        res.status(500).json({ message: err.message });
    }
}

async function handleAddPackage(req, res) {
    try {
        const { customerId } = req.params;
        const { paidAmount, bonusAmount } = req.body;
        if (!paidAmount || !Number.isInteger(paidAmount) || paidAmount <= 0) {
             return res.status(400).json({ message: "O valor pago deve ser um inteiro positivo." });
        }
        if (bonusAmount === undefined || bonusAmount < 0 || !Number.isInteger(bonusAmount)) {
             return res.status(400).json({ message: "O valor do bônus deve ser um inteiro positivo ou zero." });
        }
        // Chamando a função correta que agora está no customerService
        customerService.addPackageToCustomer(customerId, { paidAmount, bonusAmount });
        res.status(201).json({ message: 'Pacote adicionado com sucesso.' });
    } catch (err) {
        console.error("Erro em handleAddPackage:", err);
        res.status(500).json({ message: err.message });
    }
}

/**
 * NOVA FUNÇÃO
 * Lida com a requisição para salvar a tabela de preços de um cliente.
 */
async function handleUpdateCustomerPrices(req, res) {
    try {
        const { customerId } = req.params;
        const prices = req.body.prices; // Espera um array de { product_id, price }
        if (!Array.isArray(prices)) {
            return res.status(400).json({ message: 'Formato de dados de preços inválido.' });
        }
        customerService.updateCustomerPrices(customerId, prices);
        res.status(200).json({ message: 'Preços atualizados com sucesso.' });
    } catch (err) {
        console.error("Erro em handleUpdateCustomerPrices:", err);
        res.status(500).json({ message: 'Erro interno ao atualizar preços.' });
    }
}

// CORREÇÃO: Adicionamos as duas funções que faltavam ao objeto de exportação.
module.exports = {
    handleCreateCustomer,
    handleSearchCustomers,
    handleGetCustomerDetails,
    handleUpdateCustomer,
    handleAddCredit,
    handleAddPackage,
    handleUpdateCustomerPrices,
};