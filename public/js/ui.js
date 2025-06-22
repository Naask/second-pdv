// public/js/ui.js
// Objeto de elementos atualizado com as novas referências de UI
// OBJETO DE ELEMENTOS COMPLETO E CORRIGIDO
const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    messageContainer: document.getElementById('message-container'),

    // --- Cabeçalho ---
    orderIdDisplay: document.getElementById('order-id-display'),
    customerSearchInput: document.getElementById('customer-search-input'),
    customerSuggestions: document.getElementById('customer-suggestions'),
    customerNameDisplay: document.getElementById('customer-name-display'),
    newCustomerBtn: document.getElementById('new-customer-btn'),
    editCustomerBtn: document.getElementById('edit-customer-btn'),
    managePricesBtn: document.getElementById('manage-prices-btn'),
    headerCustomerBalance: document.getElementById('header-customer-balance'),
    addPackageBtn: document.getElementById('add-package-btn'),
    viewCustomerOrdersBtn: document.getElementById('view-customer-orders-btn'),

    // --- Painel de Produtos ---
    productSearchInput: document.getElementById('product-search-input'),
    categoryPanel: document.getElementById('category-panel'),
    productList: document.getElementById('product-list'),
    productCardTemplate: document.getElementById('product-card-template'),
    
    // --- Painel de Pedido ---
    orderItemsTbody: document.getElementById('order-items-tbody'),
    summaryFooter: document.querySelector('.summary-footer'),
    footerItemCount: document.getElementById('footer-item-count'),
    footerSubtotal: document.getElementById('footer-subtotal'),
    footerTotal: document.getElementById('footer-total'),

    // --- Painel de Ações ---
    pickupDatetimeInput: document.getElementById('pickup-datetime-input'),
    completedAtInput: document.getElementById('completed-at-input'),
    paidAtInput: document.getElementById('paid-at-input'),
    executionStatusOptions: document.getElementById('execution-status-options'),
    printReceiptBtn: document.getElementById('print-receipt-btn'),

    // --- Elementos de Pagamento (Restaurados) ---
    paymentStatusDisplay: document.getElementById('payment-status-display'),
    paymentTotalDue: document.getElementById('payment-total-due'),
    paymentApplied: document.getElementById('payment-applied'),
    paymentRemaining: document.getElementById('payment-remaining'),
    paymentMethods: document.getElementById('payment-methods'),
    stagedPaymentsList: document.getElementById('staged-payments-list'),

    // --- Modais ---
    newCustomerModal: document.getElementById('new-customer-modal'),
    newCustomerForm: document.getElementById('new-customer-form'),
    customerOrdersModal: document.getElementById('customer-orders-modal'),
    priceManagementModal: document.getElementById('price-management-modal'),
};

export const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const showLoading = (isLoading) => elements.loadingOverlay.classList.toggle('hidden', !isLoading);
export const toggleModal = (modalId, show) => document.getElementById(modalId).classList.toggle('hidden', !show);
export const getISODateString = (date = new Date()) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

export function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    elements.messageContainer.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 4000);
}

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
        const itemId = item.order_item_id || item.temp_id;
        const itemTotalPrice = (item.unit_price || 0) * (item.quantity || 0);
        row.innerHTML = `
            <td><input type="number" class="quantity-input" value="${item.quantity}" data-item-id="${itemId}" min="0.1" step="${item.unit_of_measure === 'KG' ? '0.1' : '1'}"></td>
            <td>${item.product_name}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(itemTotalPrice)}</td>
            <td><button class="remove-item-btn" data-item-id="${itemId}">&times;</button></td>
        `;
        row.querySelector('.remove-item-btn').addEventListener('click', (e) => onRemove(e.target.dataset.itemId));
        row.querySelector('.quantity-input').addEventListener('change', (e) => {
            onQuantityChange(e.target.dataset.itemId, parseFloat(e.target.value))
        });
        elements.orderItemsTbody.appendChild(row);
    });
}

function updateSummaryFooter(order) {
    const itemCount = order?.items?.length || 0;
    const totalAmount = order?.total_amount || 0;
    elements.footerItemCount.textContent = `ITENS: ${itemCount}`;
    elements.footerSubtotal.textContent = `SUBTOTAL: ${formatCurrency(totalAmount)}`;
    elements.footerTotal.textContent = `TOTAL: ${formatCurrency(totalAmount)}`;
}

function renderPaymentDetails(order, balance) {
    const totalAmount = order?.total_amount || 0;
    const allPayments = [...(order?.payments || []), ...(order?.stagedPayments || [])];
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - totalPaid;
    const customerBalance = balance?.totalBalance || 0;

    elements.paymentStatusDisplay.textContent = (order?.payment_status || 'AGUARDANDO').replace(/_/g, ' ');
    elements.paymentTotalDue.textContent = formatCurrency(totalAmount);
    elements.paymentApplied.textContent = formatCurrency(totalPaid);
    elements.paymentRemaining.textContent = formatCurrency(remaining);

    elements.paymentMethods.querySelectorAll('button').forEach(btn => {
        const method = btn.dataset.method.toUpperCase();
        if (method === 'SALDO') {
            btn.disabled = remaining <= 0 || customerBalance <= 0;
        } else {
            btn.disabled = remaining <= 0;
        }
    });
}

function renderStagedPayments(payments, onRemove) {
    elements.stagedPaymentsList.innerHTML = '';
    payments.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${p.method}: ${formatCurrency(p.amount)}</span>
            <button class="remove-payment-btn" data-payment-id="${p.id}">&times;</button>
        `;
        // O listener de clique agora é adicionado na função init, de forma delegada.
        elements.stagedPaymentsList.appendChild(li);
    });
}

export function renderOrder(order, balance, callbacks) {
    if (!order) {
        resetOrderView(false);
        return;
    }
    elements.orderIdDisplay.textContent = order.isNew ? 'Pedido #NOVO' : `Pedido #${order.order_id}`;
    // Habilita ou desabilita o botão de impressão
    elements.printReceiptBtn.disabled = !!order.isNew; // Desabilitado se o pedido for novo
    
    renderOrderItems(order.items, callbacks.onRemoveItem, callbacks.onQuantityChange);
    updateSummaryFooter(order);
    renderPaymentDetails(order, balance);
    renderStagedPayments(order.stagedPayments || [], callbacks.onRemoveStagedPayment);

    document.getElementById('pickup-datetime-input').value = order.pickup_datetime || '';
    document.getElementById('completed-at-input').value = order.completed_at || '';
    elements.paidAtInput.value = order.paid_at || '';

    elements.executionStatusOptions.querySelectorAll('.option-button').forEach(btn => {
        const isSelected = btn.dataset.status === order.execution_status;
        btn.classList.toggle('selected', isSelected);
        btn.classList.remove('status-green-light', 'status-green-dark');
        if (isSelected) {
            if (['AGUARDANDO_RETIRADA', 'AGUARDANDO_ENTREGA'].includes(order.execution_status)) btn.classList.add('status-green-light');
            else if (order.execution_status === 'CONCLUIDO') btn.classList.add('status-green-dark');
        }
    });
}

export function renderCustomerInfo(customer, balance) {
    if (customer) {
        // --- SE UM CLIENTE ESTÁ SELECIONADO ---
        elements.customerNameDisplay.textContent = customer.name;
        elements.headerCustomerBalance.textContent = `Saldo: ${formatCurrency(balance.totalBalance)}`;
        elements.headerCustomerBalance.style.display = 'inline-block';
        
        // Habilita todos os botões relacionados ao cliente
        elements.viewCustomerOrdersBtn.disabled = false;
        elements.editCustomerBtn.disabled = false;
        elements.addPackageBtn.disabled = false;
        elements.managePricesBtn.disabled = false; // <-- O BOTÃO É HABILITADO AQUI

    } else {
        // --- SE NENHUM CLIENTE ESTÁ SELECIONADO ---
        elements.customerNameDisplay.textContent = 'Nenhum';
        elements.headerCustomerBalance.style.display = 'none';
        
        // Desabilita todos os botões relacionados ao cliente
        elements.viewCustomerOrdersBtn.disabled = true;
        elements.editCustomerBtn.disabled = true;
        elements.addPackageBtn.disabled = true;
        elements.managePricesBtn.disabled = true; // <-- O BOTÃO É DESABILITADO AQUI
    }
}

export function populateCustomerModal(customer) {
    const title = document.querySelector('#new-customer-modal h2');
    const form = elements.newCustomerForm;
    if (customer) {
        title.textContent = 'Editar Cliente';
        form.querySelector('#new-name').value = customer.name;
        form.querySelector('#new-phone').value = customer.phone || '';
        form.querySelector('#new-email').value = customer.email || '';
        const addressInput = form.querySelector('#new-address');
        if(addressInput) addressInput.value = customer.address || '';
    } else {
        title.textContent = 'Novo Cliente';
        form.reset();
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

export const clearCustomerSuggestions = () => {
    if(elements.customerSuggestions) {
        elements.customerSuggestions.innerHTML = '';
        elements.customerSuggestions.classList.add('hidden');
    }
};

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
    if (suggestionsDiv) {
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
            row.innerHTML = `<td>${order.order_id}</td><td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td><td>${(order.execution_status || '').replace(/_/g, ' ')}</td><td>${(order.payment_status || '').replace(/_/g, ' ')}</td><td>${formatCurrency(order.total_amount)}</td>`;
            row.addEventListener('click', () => onSelect(order.order_id));
            tbody.appendChild(row);
        });
    }
    toggleModal('customer-orders-modal', true);
}

/**
 * NOVA FUNÇÃO
 * Renderiza o modal de gerenciamento de preços para um cliente.
 * @param {object} customer - O objeto do cliente.
 * @param {Array} allProducts - Array com todos os produtos do sistema e seus preços padrão.
 * @param {Array} customerProducts - Array com os produtos e os preços específicos do cliente.
 */
export function renderPriceManagementModal(customer, allProducts, customerProducts) {
    // Seleciona os elementos do modal de preços
    const modal = document.getElementById('price-management-modal');
    if (!modal) return; // Segurança caso o modal não exista

    modal.querySelector('#modal-price-customer-name').textContent = customer.name;
    const tbody = modal.querySelector('#customer-prices-tbody');
    tbody.innerHTML = '';

    // Cria um mapa de preços especiais para busca rápida (ID do produto -> preço especial)
    const priceMap = new Map(customerProducts.map(p => [p.product_id, p.price]));

    // Para cada produto padrão no sistema...
    allProducts.forEach(product => {
        // Verifica se o cliente tem um preço especial para este produto
        const specialPrice = priceMap.get(product.product_id);
        
        // Verifica se o preço especial é diferente do preço padrão
        const isPriceSpecial = specialPrice !== undefined && specialPrice !== product.price;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
                <input 
                    type="number" 
                    class="special-price-input ${isPriceSpecial ? 'has-special-price' : ''}" 
                    data-product-id="${product.product_id}"
                    placeholder="Padrão"
                    value="${isPriceSpecial ? (specialPrice / 100).toFixed(2) : ''}"
                    step="0.01"
                >
            </td>
        `;
        tbody.appendChild(row);
    });

    toggleModal('price-management-modal', true);
}

export function resetOrderView(clearCustomer = true) {
    elements.orderIdDisplay.textContent = 'Pedido #NOVO';
    renderOrderItems([], () => {}, () => {});
    updateSummaryFooter({ items: [], total_amount: 0 });
    renderPaymentDetails(null, { totalBalance: 0 });
    renderStagedPayments([], () => {});
    document.getElementById('pickup-datetime-input').value = '';
    document.getElementById('completed-at-input').value = '';
    elements.paidAtInput.value = '';
    elements.executionStatusOptions.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected', 'status-green-light', 'status-green-dark'));
    
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
        address: document.getElementById('new-address') ? document.getElementById('new-address').value.trim() : '',
    };
}