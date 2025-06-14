// public/js/ui.js - VERSÃO COM A CORREÇÃO DO 'ReferenceError'

// --- Cache de Elementos do DOM ---
const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    messageContainer: document.getElementById('message-container'),
    orderIdDisplay: document.getElementById('order-id-display'),
    customerSearchInput: document.getElementById('customer-search-input'),
    customerSuggestions: document.getElementById('customer-suggestions'),
    customerNameDisplay: document.getElementById('customer-name-display'),
    categoryPanel: document.getElementById('category-panel'),
    productList: document.getElementById('product-list'),
    productCardTemplate: document.getElementById('product-card-template'),
    orderItemsTbody: document.getElementById('order-items-tbody'),
    cardCustomerName: document.getElementById('card-customer-name'),
    cardCustomerBalance: document.getElementById('card-customer-balance'),
    footerItemCount: document.getElementById('footer-item-count'),
    footerSubtotal: document.getElementById('footer-subtotal'),
    footerTotal: document.getElementById('footer-total'),
    newCustomerModal: document.getElementById('new-customer-modal'),
    newCustomerForm: document.getElementById('new-customer-form'),
    // Adicionamos os botões aqui para um controle mais fácil
    viewCustomerOrdersBtn: document.getElementById('view-customer-orders-btn'),
    saveOrderBtn: document.getElementById('save-order-btn'),
};

// --- Funções Auxiliares ---
export const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export function renderCategories(categories, onSelect) {
    elements.categoryPanel.innerHTML = '';
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

export function filterProducts(category) {
    const products = elements.productList.querySelectorAll('.product-card');
    products.forEach(p => {
        p.classList.toggle('hidden', category !== 'TODAS' && p.dataset.category !== category);
    });
}

function renderOrderItems(items, onRemove, onQuantityChange) {
    elements.orderItemsTbody.innerHTML = '';
    if (!items || items.length === 0) {
        elements.orderItemsTbody.innerHTML = '<tr><td colspan="5">Adicione produtos ao pedido.</td></tr>';
        return;
    }
    items.forEach(item => {
        const row = document.createElement('tr');
        const itemTotalPrice = (item.unit_price || 0) * (item.quantity || 0);

        row.innerHTML = `
            <td>
                <input 
                    type="number" 
                    class="quantity-input" 
                    value="${item.quantity}" 
                    data-item-id="${item.order_item_id}"
                    min="0.1" 
                    step="${item.unit_of_measure === 'KG' ? '0.1' : '1'}"
                >
            </td>
            <td>${item.product_name}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(itemTotalPrice)}</td>
            <td><button class="remove-item-btn" data-item-id="${item.order_item_id}">&times;</button></td>
        `;
        
        row.querySelector('.remove-item-btn').addEventListener('click', (e) => onRemove(e.target.dataset.itemId));
        row.querySelector('.quantity-input').addEventListener('change', (e) => {
            onQuantityChange(e.target.dataset.itemId, parseFloat(e.target.value));
        });

        elements.orderItemsTbody.appendChild(row);
    });
}

function updateSummaryFooter(order) {
    const itemCount = order?.items?.length || 0;
    const totalAmount = order?.items?.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0) || 0;

    elements.footerItemCount.textContent = `ITENS: ${itemCount}`;
    elements.footerSubtotal.textContent = `SUBTOTAL: ${formatCurrency(totalAmount)}`;
    elements.footerTotal.textContent = `TOTAL: ${formatCurrency(totalAmount)}`;
}

export function renderOrder(order, onRemoveItem, onQuantityChange) {
    if (!order) {
        resetOrderView(false);
        return;
    }
    
    elements.orderIdDisplay.textContent = order.isNew ? 'Pedido #NOVO' : `Pedido #${order.order_id}`;
    renderOrderItems(order.items, onRemoveItem, onQuantityChange);
    updateSummaryFooter(order);

    const pickupInput = document.getElementById('pickup-datetime-input');
    const completedInput = document.getElementById('completed-at-input');
    const paidInput = document.getElementById('paid-at-input');

    const toInputFormat = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            // Corrige o fuso horário para exibição local no input
            const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return localDate.toISOString().slice(0, 16);
        } catch (e) { return ''; }
    };
    
    pickupInput.value = toInputFormat(order.pickup_datetime);
    completedInput.value = toInputFormat(order.completed_at);
    paidInput.value = toInputFormat(order.paid_at);
    
    document.querySelectorAll('#execution-status-options .option-button').forEach(btn => {
        const isSelected = btn.dataset.status === order.execution_status;
        btn.classList.toggle('selected', isSelected);
        btn.classList.remove('status-green-light', 'status-green-dark');
        if (isSelected) {
            if (['AGUARDANDO_RETIRADA', 'AGUARDANDO_ENTREGA'].includes(order.execution_status)) {
                btn.classList.add('status-green-light');
            } else if (order.execution_status === 'CONCLUIDO') {
                btn.classList.add('status-green-dark');
            }
        }
    });

    document.querySelectorAll('#payment-status-options .option-button').forEach(btn => {
        const isSelected = btn.dataset.status === order.payment_status;
        btn.classList.toggle('selected', isSelected);
        btn.classList.remove('status-green-light');
        if (isSelected && order.payment_status === 'PAGO') {
            btn.classList.add('status-green-light');
        }
    });
}

/**
 * Atualiza as informações do cliente na tela.
 * @param {object|null} customer - O objeto do cliente ou null para limpar.
 * @param {object} balance - O objeto de saldo do cliente.
 */
export function renderCustomerInfo(customer, balance) {
    // CORREÇÃO: A lógica que usava a variável 'order' foi removida desta função.
    if (customer) {
        elements.customerNameDisplay.textContent = customer.name;
        elements.cardCustomerName.textContent = customer.name;
        elements.cardCustomerBalance.textContent = `Saldo: ${formatCurrency(balance.totalBalance)}`;
        elements.viewCustomerOrdersBtn.disabled = false;
    } else {
        elements.customerNameDisplay.textContent = 'Nenhum';
        elements.cardCustomerName.textContent = 'Selecione um cliente';
        elements.cardCustomerBalance.textContent = 'Saldo: R$ 0,00';
        elements.viewCustomerOrdersBtn.disabled = true;
    }
}

export function renderCustomerSuggestions(customers, onSelect) {
    elements.customerSuggestions.innerHTML = '';
    elements.customerSuggestions.classList.toggle('hidden', customers.length === 0);
    customers.forEach(customer => {
        const div = document.createElement('div');
        div.textContent = `${customer.name} - ${customer.phone || 'Sem telefone'}`;
        div.addEventListener('click', () => onSelect(customer.customer_id));
        elements.customerSuggestions.appendChild(div);
    });
}
export const clearCustomerSuggestions = () => elements.customerSuggestions.classList.add('hidden');

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
export const clearOrderSuggestions = () => {
    const suggestionsDiv = document.getElementById('order-suggestions');
    if(suggestionsDiv) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('hidden');
    }
};

export function renderCustomerOrdersModal(customer, orders, onSelect) {
    document.getElementById('modal-customer-name').textContent = customer.name;
    const tbody = document.getElementById('customer-orders-tbody');
    tbody.innerHTML = '';
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum pedido encontrado.</td></tr>';
    } else {
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.dataset.orderId = order.order_id;
            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                <td>${(order.execution_status || '').replace(/_/g, ' ')}</td>
                <td>${(order.payment_status || '').replace(/_/g, ' ')}</td>
                <td>${formatCurrency(order.total_amount)}</td>
            `;
            row.addEventListener('click', () => onSelect(order.order_id));
            tbody.appendChild(row);
        });
    }
    toggleModal('customer-orders-modal', true);
}

export function resetOrderView(clearCustomer = true) {
    elements.orderIdDisplay.textContent = 'Pedido #NOVO';
    renderOrderItems([]);
    updateSummaryFooter({});
    document.getElementById('pickup-datetime-input').value = '';
    document.getElementById('completed-at-input').value = '';
    document.getElementById('paid-at-input').value = '';
    document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected', 'status-green-light', 'status-green-dark'));
    
    if (clearCustomer) {
        renderCustomerInfo(null, { totalBalance: 0 });
        elements.customerSearchInput.value = '';
        clearCustomerSuggestions();
    }
}

export function getNewCustomerFormData() {
    return {
        name: document.getElementById('new-name').value.trim(),
        phone: document.getElementById('new-phone').value.trim(),
        email: document.getElementById('new-email').value.trim(),
    };
}