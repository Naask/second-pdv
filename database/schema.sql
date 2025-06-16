CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'UN'
);
-- Tabela de Pedidos (COM A CORREÇÃO NA REGRA 'CHECK')
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    
    execution_status TEXT NOT NULL DEFAULT 'AGUARDANDO_EXECUCAO' CHECK(execution_status IN ('AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'AGUARDANDO_RETIRADA', 'AGUARDANDO_ENTREGA', 'CONCLUIDO')),
    
    -- CORREÇÃO: Adicionado 'PAGO_PARCIALMENTE' para refletir a nova lógica
    payment_status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO' CHECK(payment_status IN ('AGUARDANDO_PAGAMENTO', 'PAGO_PARCIALMENTE', 'PAGO')),
    
    total_amount INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pickup_datetime DATETIME,
    completed_at DATETIME,
    paid_at DATETIME, -- Representa a data em que o pedido foi totalmente pago
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- NOVA TABELA: Armazena os pagamentos individuais de um pedido
CREATE TABLE IF NOT EXISTS order_payments (
    payment_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('SALDO', 'DINHEIRO', 'PIX', 'DEBITO', 'CREDITO')),
    amount INTEGER NOT NULL,
    paid_at DATETIME NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments (order_id); -- Novo índice
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);