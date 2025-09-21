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


/**
 * NOVO SCHEMA
 * Esquema de validação para agendar ou reagendar uma tarefa.
 * - order_id: obrigatório, string.
 * - task_type: obrigatório, deve ser 'wash' ou 'pass'.
 * - schedule_date: obrigatório, deve ser uma data válida no formato ISO (ex: "2024-09-21T14:00:00").
 */
const scheduleTaskSchema = Joi.object({
    order_id: Joi.string().required().messages({
        'string.empty': `"order_id" não pode ser vazio`,
        'any.required': `"order_id" é um campo obrigatório`
    }),
    task_type: Joi.string().valid('wash', 'pass').required().messages({
        'any.only': `"task_type" deve ser 'wash' ou 'pass'`,
        'any.required': `"task_type" é um campo obrigatório`
    }),
    // A validação Joi.date().iso() já está correta, ela garante o formato de entrada.
    schedule_date: Joi.date().iso().required().messages({
        'date.base': `"schedule_date" deve ser uma data válida`,
        'date.format': `"schedule_date" deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss)`,
        'any.required': `"schedule_date" é um campo obrigatório`
    })
});

const cancelScheduleSchema = Joi.object({
    order_id: Joi.string().required(),
    task_type: Joi.string().valid('wash', 'pass').required()
});

// Futuramente, outros esquemas podem ser adicionados aqui.
// Ex: const saleSchema = Joi.object({...});
// Ex: const discountSchema = Joi.object({...});


module.exports = {
    createCustomerSchema,
    prepaidPackageSchema,
    scheduleTaskSchema,
    cancelScheduleSchema
};