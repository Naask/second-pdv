// src/controllers/customerController.js
const customerService = require('../services/customerService'); // ÚNICA DEPENDÊNCIA DE SERVIÇO
const { createCustomerSchema, prepaidPackageSchema } = require('../utils/validationSchemas');

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

/**
 * Lida com a criação de um novo cliente.
 */
async function handleCreateCustomer(req, res) {
    try {
        // Valida os dados recebidos no corpo da requisição
        const { error, value } = createCustomerSchema.validate(req.body);
        if (error) {
            // Se houver erro de validação, retorna uma resposta 400 (Bad Request)
            return res.status(400).json({ message: error.details[0].message });
        }

        // Chama o serviço para criar o cliente com os dados validados
        const newCustomer = await customerService.createCustomer(value);
        
        // Retorna uma resposta 201 (Created) com os dados do novo cliente
        res.status(201).json(newCustomer);
    } catch (err) {
        // Em caso de erro no servidor, retorna uma resposta 500
        res.status(500).json({ message: 'Erro interno ao criar o cliente.' });
    }
}

/**
 * Lida com a atualização dos dados de um cliente existente.
 */
async function handleUpdateCustomer(req, res) {
    try {
        const { customerId } = req.params;

        // Valida os dados recebidos no corpo da requisição
        const { error, value } = createCustomerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // Chama o serviço para atualizar o cliente
        const updatedCustomer = await customerService.updateCustomer(customerId, value);
        
        // Retorna os dados atualizados do cliente com status 200 (OK)
        res.status(200).json(updatedCustomer);
    } catch (err) {
        // O serviço pode retornar um erro se o cliente não for encontrado
        if (err.message.includes("Cliente não encontrado")) {
            return res.status(404).json({ message: err.message });
        }
        // Para outros erros, retorna 500
        res.status(500).json({ message: 'Erro interno ao atualizar o cliente.' });
    }
}

// Handlers de crédito e pacote
async function handleAddCredit(req, res) {
    try {
        // Validação simples para o crédito
        const { amount } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'O valor do crédito deve ser um número positivo.' });
        }
        await customerService.addCreditToCustomer(req.params.customerId, req.body);
        res.status(201).json({ message: 'Crédito adicionado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function handleAddPackage(req, res) {
    try {
        // Validação com Joi para o pacote
        const { error, value } = prepaidPackageSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await customerService.addPackageToCustomer(req.params.customerId, value);
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