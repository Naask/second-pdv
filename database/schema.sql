-- schema.sql
-- Este script define a estrutura do banco de dados para o PDV da Lavanderia.
-- Ele é projetado para ser executado uma única vez para inicializar o banco.

-- Tabela de Clientes
-- Armazena informações básicas sobre cada cliente.
-- O 'customer_id' é um UUID (texto) para garantir um identificador único e não sequencial.
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pedidos (Simplificada)
-- Para esta fase do PDV, a tabela de pedidos é simplificada,
-- pois o foco principal é o ledger financeiro.
-- O 'order_id' também é um UUID.
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- Ex: OPEN, PAID, CANCELED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Tabela do Livro-Razão (Ledger)
-- Esta é a tabela mais importante. Ela registra TODAS as transações financeiras.
-- É uma fonte de verdade imutável (apenas registros de inserção são permitidos).
CREATE TABLE IF NOT EXISTS ledger_transactions (
    transaction_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN (
        'SALE',                 -- Débito: Um novo serviço/venda para o cliente
        'PAYMENT_RECEIVED',     -- Crédito: Cliente pagou/adicionou crédito (dinheiro, cartão)
        'BONUS_ADDED',          -- Crédito: Bônus concedido (ex: em um pacote pré-pago)
        'DISCOUNT_APPLIED',     -- Crédito: Uso de saldo de bônus para abater uma venda
        'BALANCE_CORRECTION_CREDIT', -- Crédito: Correção manual para adicionar saldo
        'BALANCE_CORRECTION_DEBIT'   -- Débito: Correção manual para remover saldo
    )),
    description TEXT NOT NULL,
    -- O valor é armazenado como um inteiro em centavos para evitar erros de ponto flutuante.
    -- Ex: R$ 25,50 é armazenado como 2550.
    amount INTEGER NOT NULL,
    -- Metadados em formato JSON para informações contextuais, como o ID do pedido.
    metadata TEXT, -- Ex: '{"order_id": "uuid-do-pedido"}'
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Índices para otimizar as consultas
-- Um índice no 'customer_id' da tabela de ledger é crucial para a performance
-- ao buscar o extrato e o saldo de um cliente.
CREATE INDEX IF NOT EXISTS idx_ledger_customer_id ON ledger_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);