-- schema.sql (VERSÃO CORRIGIDA E FINAL)

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'UN'
);

-- Tabela de Pedidos (COM A CORREÇÃO NO TIPO DE DADO DO order_id)
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY, -- CORRIGIDO: Deve ser TEXT para aceitar o ID aleatório
    customer_id TEXT NOT NULL,
    execution_status TEXT NOT NULL DEFAULT 'AGUARDANDO_EXECUCAO' CHECK(execution_status IN ('AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO')),
    payment_status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO' CHECK(payment_status IN ('AGUARDANDO_PAGAMENTO', 'PAGO', 'PAGO_PARCIALMENTE')),
    total_amount INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pickup_datetime DATETIME,
    completed_at DATETIME,
    paid_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Tabela de Itens do Pedido (COM A CORREÇÃO NO TIPO DE DADO DO order_id)
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL, -- CORRIGIDO: Deve ser TEXT para corresponder à tabela orders
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- Tabela do Livro-Razão (Ledger)
CREATE TABLE IF NOT EXISTS ledger_transactions (
    transaction_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN (
        'SALE', 'PAYMENT_RECEIVED', 'BONUS_ADDED', 'DISCOUNT_APPLIED',
        'BALANCE_CORRECTION_CREDIT', 'BALANCE_CORRECTION_DEBIT'
    )),
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ledger_customer_id ON ledger_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);