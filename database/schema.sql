-- schema.sql (Revisado para Integração Completa)
-- Este script define a estrutura completa do banco de dados, unindo a gestão
-- de pedidos/produtos com o ledger financeiro do cliente.

-- Tabela de Clientes (sem alterações)
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos (reintroduzida do sistema original)
-- Armazena todos os serviços e produtos oferecidos pela lavanderia.
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL, -- Preço em centavos
    category TEXT NOT NULL, -- Ex: 'ROUPAS DE CAMA', 'MASCULINA', 'PESO'
    unit_of_measure TEXT NOT NULL DEFAULT 'UN' -- Ex: 'UN' (unidade), 'KG'
);

-- Tabela de Pedidos (revisada e aprimorada)
-- Armazena o cabeçalho de cada pedido.
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EM_ABERTO', -- Ex: 'EM_ABERTO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO'
    total_amount INTEGER NOT NULL DEFAULT 0, -- Valor total em centavos, calculado a partir dos itens
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Tabela de Itens do Pedido (NOVA)
-- Esta é a tabela de junção que conecta produtos a pedidos.
-- Cada linha representa um item em um pedido específico.
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL, -- Usamos REAL para suportar tanto unidades (1, 2) quanto peso (1.5, 2.3)
    unit_price INTEGER NOT NULL, -- Preço unitário no momento da venda (em centavos)
    total_price INTEGER NOT NULL, -- Preço total do item (unit_price * quantity)
    FOREIGN KEY (order_id) REFERENCES orders (order_id),
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- Tabela do Livro-Razão (Ledger) (sem alterações na estrutura)
-- A fonte de verdade para todas as transações financeiras.
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
    amount INTEGER NOT NULL, -- Valor em centavos
    metadata TEXT, -- Ex: '{"order_id": "uuid-do-pedido"}'
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Índices para otimizar as consultas
CREATE INDEX IF NOT EXISTS idx_ledger_customer_id ON ledger_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);