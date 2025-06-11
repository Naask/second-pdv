// src/utils/validationSchemas.js
const Joi = require('joi');

/**
 * Esquema de validação para a criação de um novo cliente.
 * - name: obrigatório, string, mínimo 2 caracteres.
 * - phone, email, address: opcionais, strings, permitem valor vazio.
 * - email: deve ser um formato de e-mail válido se fornecido.
 */
const createCustomerSchema = Joi.object({
    name: Joi.string().min(2).required().messages({
        'string.base': `"nome" deve ser do tipo texto`,
        'string.empty': `"nome" não pode ser vazio`,
        'string.min': `"nome" deve ter no mínimo {#limit} caracteres`,
        'any.required': `"nome" é um campo obrigatório`
    }),
    phone: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional().messages({
        'string.email': `"email" deve ser um endereço de e-mail válido`
    }),
    address: Joi.string().allow('').optional()
});

/**
 * Esquema de validação para registrar a compra de um pacote pré-pago.
 * - paidAmount: obrigatório, número inteiro, estritamente positivo.
 * - bonusAmount: obrigatório, número inteiro, pode ser zero ou positivo.
 */
const prepaidPackageSchema = Joi.object({
    paidAmount: Joi.number().integer().positive().required().messages({
        'number.base': `"valor pago" deve ser um número`,
        'number.integer': `"valor pago" deve ser um número inteiro (centavos)`,
        'number.positive': `"valor pago" deve ser um número positivo`,
        'any.required': `"valor pago" é um campo obrigatório`
    }),
    bonusAmount: Joi.number().integer().min(0).required().messages({
        'number.base': `"valor do bônus" deve ser um número`,
        'number.integer': `"valor do bônus" deve ser um número inteiro (centavos)`,
        'number.min': `"valor do bônus" não pode ser negativo`,
        'any.required': `"valor do bônus" é um campo obrigatório`
    })
});

// Futuramente, outros esquemas podem ser adicionados aqui.
// Ex: const saleSchema = Joi.object({...});
// Ex: const discountSchema = Joi.object({...});


module.exports = {
    createCustomerSchema,
    prepaidPackageSchema
};