// database/seed_customers.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');
const db = require('./database.js');

// --- CONFIGURAÇÃO AJUSTADA COM BASE NAS SUAS COLUNAS ---
const CSV_COLUMN_MAP = {
    name: 'Nome',
    phone: 'Telefone',
    email: 'e-mail',
    balance: 'Saldo',
    address: 'Endereço',
    complement: 'Complemento',
    neighborhood: 'Bairro',
};
// ---------------------------------------------------------


/**
 * Função principal que lê o CSV e insere os clientes e seus saldos no banco de dados.
 */
function seedCustomers() {
    console.log('Iniciando o povoamento da tabela de clientes a partir do CSV...');

    const csvFilePath = path.resolve(__dirname, '..', 'BrilhoDB - Customers.csv');
    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ ERRO: Arquivo não encontrado em ${csvFilePath}`);
        console.error("Por favor, certifique-se de que o arquivo 'BrilhoDB - Customers.csv' está na pasta raiz do seu projeto.");
        return;
    }

    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    // Uma única transação para inserir o cliente e seu saldo, garantindo a integridade dos dados.
    const seedTransaction = db.transaction((customers) => {
        const customerInsert = db.prepare(`
            INSERT INTO customers (customer_id, name, phone, email, address) 
            VALUES (@customerId, @name, @phone, @email, @address)
        `);
        const ledgerInsert = db.prepare(`
            INSERT INTO ledger_transactions (transaction_id, customer_id, transaction_type, description, amount, metadata) 
            VALUES (@transactionId, @customerId, @type, @description, @amount, @metadata)
        `);

        let insertedCount = 0;
        let skippedCount = 0;

        for (const customer of customers) {
            const customerName = customer[CSV_COLUMN_MAP.name];
            if (!customerName) continue;

            const existing = db.prepare('SELECT customer_id FROM customers WHERE name = ? AND phone = ?').get(
                customerName,
                customer[CSV_COLUMN_MAP.phone]
            );

            if (!existing) {
                const customerId = crypto.randomUUID();

                // Combina os campos de endereço em um só
                const fullAddress = [
                    customer[CSV_COLUMN_MAP.address],
                    customer[CSV_COLUMN_MAP.complement],
                    customer[CSV_COLUMN_MAP.neighborhood]
                ].filter(part => part).join(', '); // Junta as partes não vazias com uma vírgula

                // Insere o cliente
                customerInsert.run({
                    customerId: customerId,
                    name: customerName,
                    phone: customer[CSV_COLUMN_MAP.phone] || null,
                    email: customer[CSV_COLUMN_MAP.email] || null,
                    address: fullAddress || null,
                });

                // Migra o saldo para o ledger, se houver
                const balanceValue = parseFloat(String(customer[CSV_COLUMN_MAP.balance] || '0').replace(',', '.')) || 0;
                if (balanceValue > 0) {
                    const balanceInCents = Math.round(balanceValue * 100);
                    
                    ledgerInsert.run({
                        transactionId: crypto.randomUUID(),
                        customerId: customerId,
                        type: 'PAYMENT_RECEIVED',
                        description: 'Saldo inicial migrado do sistema antigo',
                        amount: balanceInCents,
                        metadata: JSON.stringify({ migration: true })
                    });
                }
                insertedCount++;
            } else {
                skippedCount++;
            }
        }
        console.log(`> Inseridos: ${insertedCount} novos clientes.`);
        console.log(`> Ignorados: ${skippedCount} clientes já existentes.`);
    });

    try {
        seedTransaction(records);
        console.log('✅ Povoamento da tabela de clientes concluído com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao popular a tabela de clientes:', err.message);
    }
}

// Executa a função
seedCustomers();