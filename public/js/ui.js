const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    messageContainer: document.getElementById('message-container'),
    orderIdDisplay: document.getElementById('order-id-display'),
    customerSearchInput: document.getElementById('customer-search-input'),
    customerSuggestions: document.getElementById('customer-suggestions'),
    customerNameDisplay: document.getElementById('customer-name-display'),
    editCustomerBtn: document.getElementById('edit-customer-btn'),
    viewCustomerOrdersBtn: document.getElementById('view-customer-orders-btn'),
    addCreditBtn: document.getElementById('add-credit-btn'),
    addPackageBtn: document.getElementById('add-package-btn'),
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
    paymentStatusDisplay: document.getElementById('payment-status-display'),
    paymentBreakdown: document.getElementById('payment-breakdown'),
    paymentMethods: document.getElementById('payment-methods'),
    stagedPaymentsList: document.getElementById('staged-payments-list'),
    paymentTotalDue: document.getElementById('payment-total-due'),
    paymentApplied: document.getElementById('payment-applied'),
    paymentRemaining: document.getElementById('payment-remaining'),
};

export const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const showLoading = (isLoading) => elements.loadingOverlay.classList.toggle('hidden', !isLoading);
export const toggleModal = (modalId, show) => document.getElementById(modalId)?.classList.toggle('hidden', !show);
export const clearForm = (formElement) => formElement?.reset();

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
        const itemTotalPrice = (item.unit_price || 0) * (item.quantity || 0);
        row.innerHTML = `
            <td><input type="number" class="quantity-input" value="${item.quantity}" data-item-id="${item.order_item_id}" min="0.1" step="${item.unit_of_measure === 'KG' ? '0.1' : '1'}"></td>
            <td>${item.product_name}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(itemTotalPrice)}</td>
            <td><button class="remove-item-btn" data-item-id="${item.order_item_id}">&times;</button></td>
        `;
        row.querySelector('.remove-item-btn').addEventListener('click', (e) => onRemove(e.target.dataset.itemId));
        row.querySelector('.quantity-input').addEventListener('change', (e) => onQuantityChange(e.target.dataset.itemId, parseFloat(e.target.value)));
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

function renderPaymentPane(order, balance, onRemovePayment) {
    const isOrderActive = !!order;
    const isPaid = order?.payment_status === 'PAGO';

    elements.paymentBreakdown.classList.toggle('hidden', !isOrderActive);
    elements.paymentMethods.classList.toggle('hidden', !isOrderActive || isPaid);
    elements.stagedPaymentsList.classList.toggle('hidden', !isOrderActive || isPaid);

    const total = order?.total_amount || 0;
    const totalStagedPaid = order?.stagedPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remaining = total - totalStagedPaid;
    
    let statusText = 'AGUARDANDO';
    if (order) {
        if(isPaid) {
            statusText = 'PAGO';
        } else if (totalStagedPaid >= total && total > 0) {
            statusText = 'PAGO (não salvo)';
        } else if (totalStagedPaid > 0) {
            statusText = 'PAGANDO...';
        } else {
            statusText = order.payment_status.replace(/_/g, ' ');
        }
    }
    elements.paymentStatusDisplay.textContent = statusText;
    
    if (!isOrderActive) return;

    elements.paymentTotalDue.textContent = formatCurrency(total);
    elements.paymentApplied.textContent = formatCurrency(totalStagedPaid);
    elements.paymentRemaining.textContent = formatCurrency(remaining);
    
    elements.stagedPaymentsList.innerHTML = '';
    order.stagedPayments?.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `${p.method}: ${formatCurrency(p.amount)} <button class="remove-payment-btn" data-payment-id="${p.id}">&times;</button>`;
        li.querySelector('.remove-payment-btn').addEventListener('click', () => onRemovePayment(p.id));
        elements.stagedPaymentsList.appendChild(li);
    });

    const balanceAvailable = balance?.totalBalance > 0 ? balance.totalBalance : 0;
    elements.paymentMethods.querySelector('[data-method="Saldo"]').disabled = balanceAvailable <= 0 || remaining <= 0;
}

export function renderOrder(order, onRemoveItem, onQuantityChange, onRemovePayment, currentBalance) {
    if (!order) {
        resetOrderView(false);
        return;
    }
    elements.orderIdDisplay.textContent = order.isNew ? 'Pedido #NOVO' : `Pedido #${order.order_id}`;
    renderOrderItems(order.items, onRemoveItem, onQuantityChange);
    updateSummaryFooter(order);
    
    const toInputFormat = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const localDate = new Date(date.getTime() - (new Date().getTimezoneOffset() * 60000));
            return localDate.toISOString().slice(0, 16);
        } catch (e) { return ''; }
    };
    
    document.getElementById('pickup-datetime-input').value = toInputFormat(order.pickup_datetime);
    document.getElementById('completed-at-input').value = toInputFormat(order.completed_at);
    document.getElementById('payment-date-input').value = toInputFormat(order.paid_at);
    
    document.querySelectorAll('#execution-status-options .option-button').forEach(btn => {
        const isSelected = btn.dataset.status === order.execution_status;
        btn.classList.toggle('selected', isSelected);
        btn.classList.remove('status-green-light', 'status-green-dark');
        if (isSelected) {
            if (['AGUARDANDO_RETIRADA', 'AGUARDANDO_ENTREGA'].includes(order.execution_status)) btn.classList.add('status-green-light');
            else if (order.execution_status === 'CONCLUIDO') btn.classList.add('status-green-dark');
        }
    });
    
    renderPaymentPane(order, currentBalance, onRemovePayment);
}

export function renderCustomerInfo(customer, balance) {
    const actionsEnabled = !!customer;
    elements.editCustomerBtn.disabled = !actionsEnabled;
    elements.viewCustomerOrdersBtn.disabled = !actionsEnabled;
    elements.addCreditBtn.disabled = !actionsEnabled;
    elements.addPackageBtn.disabled = !actionsEnabled;

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
    if (suggestionsDiv) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('hidden');
    }
};

export function renderCustomerOrdersModal(customer, orders, onSelect) {
    const modalName = document.getElementById('modal-customer-name');
    if (modalName) modalName.textContent = customer.name;
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

export function resetOrderView(clearCustomer = true) {
    elements.orderIdDisplay.textContent = 'Pedido #NOVO';
    renderOrderItems([]);
    updateSummaryFooter({});
    document.getElementById('pickup-datetime-input').value = '';
    document.getElementById('completed-at-input').value = '';
    document.getElementById('payment-date-input').value = '';
    document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
    
    renderPaymentPane(null, null, null);

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