// public/js/ui.js
// Módulo responsável por toda a manipulação do DOM.

// --- Cache de Elementos do DOM ---
const elements = {
    // Overlays e Mensagens
    loadingOverlay: document.getElementById('loading-overlay'),
    messageContainer: document.getElementById('message-container'),
    // Header
    orderIdDisplay: document.getElementById('order-id-display'),
    customerSearchInput: document.getElementById('customer-search-input'),
    customerSuggestions: document.getElementById('customer-suggestions'),
    customerNameDisplay: document.getElementById('customer-name-display'),
    // Painel de Produtos
    categoryPanel: document.getElementById('category-panel'),
    productList: document.getElementById('product-list'),
    productCardTemplate: document.getElementById('product-card-template'),
    // Painel do Pedido
    orderItemsTbody: document.getElementById('order-items-tbody'),
    // Painel de Ações
    cardCustomerName: document.getElementById('card-customer-name'),
    cardCustomerBalance: document.getElementById('card-customer-balance'),
    orderStatusOptions: document.getElementById('order-status-options'),
    payOrderBtn: document.getElementById('pay-order-btn'),
    // Rodapé
    footerItemCount: document.getElementById('footer-item-count'),
    footerSubtotal: document.getElementById('footer-subtotal'),
    footerTotal: document.getElementById('footer-total'),
    // Modais
    newCustomerModal: document.getElementById('new-customer-modal'),
    newCustomerForm: document.getElementById('new-customer-form'),
};

// --- Funções Auxiliares ---

const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const showLoading = (isLoading) => elements.loadingOverlay.classList.toggle('hidden', !isLoading);
export const toggleModal = (modalId, show) => document.getElementById(modalId).classList.toggle('hidden', !show);
export const clearForm = (formElement) => formElement.reset();

export function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    elements.messageContainer.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 4000);
}

// --- Funções de Renderização ---

/**
 * Renderiza os botões de categoria.
 * @param {string[]} categories - Array com os nomes das categorias.
 * @param {Function} onSelect - Callback a ser executado ao clicar, passando a categoria.
 */
export function renderCategories(categories, onSelect) {
    elements.categoryPanel.innerHTML = ''; // Limpa antes de renderizar
    const allButton = document.createElement('button');
    allButton.className = 'category-button selected';
    allButton.textContent = 'TODAS';
    allButton.dataset.category = 'TODAS';
    allButton.addEventListener('click', () => {
        document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('selected'));
        allButton.classList.add('selected');
        onSelect('TODAS');
    });
    elements.categoryPanel.appendChild(allButton);

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-button';
        btn.textContent = category;
        btn.dataset.category = category;
        btn.addEventListener('click', () => {
             document.querySelectorAll('.category-button').forEach(b => b.classList.remove('selected'));
             btn.classList.add('selected');
             onSelect(category);
        });
        elements.categoryPanel.appendChild(btn);
    });
}

/**
 * Renderiza os cards de produtos.
 * @param {object[]} products - Array com os objetos de produto.
 * @param {Function} onSelect - Callback a ser executado ao clicar, passando o produto.
 */
export function renderProducts(products, onSelect) {
    elements.productList.innerHTML = '';
    products.forEach(product => {
        const card = elements.productCardTemplate.content.cloneNode(true);
        const cardElement = card.querySelector('.product-card');
        cardElement.querySelector('.product-name').textContent = product.name;
        cardElement.querySelector('.product-price').textContent = formatCurrency(product.price);
        cardElement.dataset.productId = product.product_id;
        cardElement.dataset.category = product.category;
        cardElement.addEventListener('click', () => onSelect(product));
        elements.productList.appendChild(cardElement);
    });
}

/**
 * Filtra os produtos visíveis com base na categoria selecionada.
 * @param {string} category - A categoria para mostrar. 'TODAS' para mostrar todos.
 */
export function filterProducts(category) {
    const products = elements.productList.querySelectorAll('.product-card');
    products.forEach(p => {
        p.classList.toggle('hidden', category !== 'TODAS' && p.dataset.category !== category);
    });
}

/**
 * Renderiza a tabela de itens de um pedido.
 * @param {object[]} items - Array com os itens do pedido.
 * @param {Function} onRemove - Callback ao clicar para remover um item.
 */
function renderOrderItems(items, onRemove) {
    elements.orderItemsTbody.innerHTML = '';
    if (!items || items.length === 0) {
        elements.orderItemsTbody.innerHTML = '<tr><td colspan="5">Adicione produtos ao pedido.</td></tr>';
        return;
    }
    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.quantity}</td>
            <td>${item.product_name}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(item.total_price)}</td>
            <td><button class="remove-item-btn" data-item-id="${item.order_item_id}">&times;</button></td>
        `;
        row.querySelector('.remove-item-btn').addEventListener('click', (e) => onRemove(e.target.dataset.itemId));
        elements.orderItemsTbody.appendChild(row);
    });
}

/**
 * Atualiza o rodapé de resumo com os totais do pedido.
 * @param {object} order - O objeto do pedido.
 */
function updateSummaryFooter(order) {
    const itemCount = order.items?.length || 0;
    const totalAmount = order?.total_amount || 0;
    elements.footerItemCount.textContent = `ITENS: ${itemCount}`;
    elements.footerSubtotal.textContent = `SUBTOTAL: ${formatCurrency(totalAmount)}`;
    elements.footerTotal.textContent = `TOTAL: ${formatCurrency(totalAmount)}`;
}

/**
 * Renderiza as sugestões de busca de pedido.
 * @param {object[]} orders - Array de pedidos.
 * @param {Function} onSelect - Callback ao selecionar um pedido.
 */
export function renderOrderSuggestions(orders, onSelect) {
    const suggestionsDiv = document.getElementById('order-suggestions');
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.toggle('hidden', orders.length === 0);
    orders.forEach(o => {
        const div = document.createElement('div');
        div.textContent = `Pedido #${o.order_id} (${o.customer_name})`;
        div.addEventListener('click', () => onSelect(o.order_id));
        suggestionsDiv.appendChild(div);
    });
}

export function clearOrderSuggestions() {
    const suggestionsDiv = document.getElementById('order-suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('hidden');
    }
}


/**
 * Função principal para renderizar o estado de um pedido na tela.
 * @param {object} order - O objeto do pedido completo.
 * @param {Function} onRemoveItem - Callback para o evento de remover item.
 */
export function renderOrder(order, onRemoveItem) {
    if (!order) {
        resetOrderView();
        return;
    }
    
    elements.orderIdDisplay.textContent = `Pedido #${order.order_id}`;
    renderOrderItems(order.items, onRemoveItem);
    updateSummaryFooter(order);

    // Atualiza campo de data/hora para retirada
    const pickupInput = document.getElementById('pickup-datetime-input');
    if (order.pickup_datetime) {
        try {
            // Formata para o padrão do input datetime-local (YYYY-MM-DDTHH:mm)
            // A conversão para o fuso horário local é importante
            const localDate = new Date(new Date(order.pickup_datetime).getTime() - (new Date().getTimezoneOffset() * 60000));
            pickupInput.value = localDate.toISOString().slice(0, 16);
        } catch (e) {
            console.error("Data de retirada inválida:", order.pickup_datetime);
            pickupInput.value = '';
        }
    } else {
        pickupInput.value = '';
    }
    
    // Atualiza status de execução
    document.querySelectorAll('#execution-status-options .option-button').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.status === order.execution_status);
    });

    // Atualiza status de pagamento
    document.querySelectorAll('#payment-status-options .option-button').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.status === order.payment_status);
    });
    
    // Habilita/desabilita botão de pagamento com base em ambos os status
    const canPay = order.payment_status === 'AGUARDANDO_PAGAMENTO' && order.total_amount > 0;
    elements.payOrderBtn.disabled = !canPay;
}

/**
 * Atualiza as informações do cliente na tela.
 * @param {object|null} customer - O objeto do cliente ou null para limpar.
 */
export function renderCustomerInfo(customer, balance) {
    if (customer) {
        elements.customerNameDisplay.textContent = customer.name;
        elements.cardCustomerName.textContent = customer.name;
        elements.cardCustomerBalance.textContent = `Saldo: ${formatCurrency(balance.totalBalance)}`;
    } else {
        elements.customerNameDisplay.textContent = 'Nenhum';
        elements.cardCustomerName.textContent = 'Selecione um cliente';
        elements.cardCustomerBalance.textContent = 'Saldo: R$ 0,00';
    }
}

/**
 * Renderiza as sugestões de busca de cliente.
 * @param {object[]} customers - Array de clientes.
 * @param {Function} onSelect - Callback ao selecionar um cliente.
 */
export function renderCustomerSuggestions(customers, onSelect) {
    elements.customerSuggestions.innerHTML = '';
    elements.customerSuggestions.classList.toggle('hidden', customers.length === 0);
    customers.forEach(c => {
        const div = document.createElement('div');
        div.textContent = c.name;
        div.addEventListener('click', () => onSelect(c.customer_id));
        elements.customerSuggestions.appendChild(div);
    });
}
export const clearCustomerSuggestions = () => elements.customerSuggestions.classList.add('hidden');

/**
 * Reseta a interface para um estado de "novo pedido".
 */
export function resetOrderView() {
    elements.orderIdDisplay.textContent = 'Pedido #NOVO';
    renderOrderItems([]);
    updateSummaryFooter({});
    renderCustomerInfo(null, { totalBalance: 0 });
    elements.customerSearchInput.value = '';
}

/**
 * Obtém os dados do formulário de novo cliente.
 */
export function getNewCustomerFormData() {
    return {
        name: document.getElementById('new-name').value.trim(),
        phone: document.getElementById('new-phone').value.trim(),
        email: document.getElementById('new-email').value.trim(),
    };
}