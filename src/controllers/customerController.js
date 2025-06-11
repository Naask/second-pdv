// src/controllers/customerController.js
const ledgerService = require('../services/ledgerService');
const { createCustomerSchema, prepaidPackageSchema } = require('../utils/validationSchemas');

/**
 * Lida com a criação de um novo cliente.
 */
async function handleCreateCustomer(req, res) {
    try {
        // 1. Validar o corpo da requisição com Joi
        const { error, value } = createCustomerSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ message: 'Dados inválidos.', details: errorMessages });
        }

        // 2. Chamar o serviço para criar o cliente
        const newCustomer = ledgerService.createCustomer(value);

        // 3. Enviar a resposta de sucesso
        res.status(201).json(newCustomer);
    } catch (err) {
        console.error('Erro no handleCreateCustomer:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao criar cliente.' });
    }
}

/**
 * Lida com a busca de clientes por nome.
 */
async function handleSearchCustomers(req, res) {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ message: 'O parâmetro de busca "name" é obrigatório.' });
        }

        const customers = ledgerService.findCustomersByName(name);
        res.status(200).json(customers);
    } catch (err) {
        console.error('Erro no handleSearchCustomers:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar clientes.' });
    }
}

/**
 * Lida com a busca de detalhes completos de um cliente (dados + saldo + extrato).
 */
async function handleGetCustomerDetails(req, res) {
    try {
        const { customerId } = req.params;
        const customerData = ledgerService.getCustomerById(customerId);

        if (!customerData) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        const balance = ledgerService.getCustomerBalance(customerId);
        const ledger = ledgerService.getCustomerLedger(customerId);

        res.status(200).json({
            details: customerData,
            balance,
            ledger
        });
    } catch (err) {
        console.error('Erro no handleGetCustomerDetails:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar detalhes do cliente.' });
    }
}

/**
 * Lida com o registro de um pacote pré-pago para um cliente.
 */
async function handleRecordPrepaidPackage(req, res) {
    try {
        const { customerId } = req.params;

        // 1. Validar o corpo da requisição
        const { error, value } = prepaidPackageSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ message: 'Dados inválidos para o pacote.', details: errorMessages });
        }
        
        // 2. Chamar o serviço (que é transacional)
        const { paidAmount, bonusAmount } = value;
        const result = ledgerService.recordPrepaidPackage(customerId, paidAmount, bonusAmount);

        if (result.success) {
            res.status(201).json({ message: 'Pacote pré-pago registrado com sucesso.' });
        } else {
            // Este caso é mais para segurança, pois a transação deve lançar um erro em caso de falha.
            throw new Error('A transação do pacote pré-pago falhou por um motivo desconhecido.');
        }

    } catch (err) {
        console.error('Erro no handleRecordPrepaidPackage:', err);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar o pacote.' });
    }
}


module.exports = {
    handleCreateCustomer,
    handleSearchCustomers,
    handleGetCustomerDetails,
    handleRecordPrepaidPackage
};