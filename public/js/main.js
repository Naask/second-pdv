import * as api from './api.js';
import * as ui from './ui.js';

const state = {
    products: [],
    categories: [],
    currentCustomer: null,
    currentBalance: null,
    currentOrder: null,
    debounceTimer: null,
    isEditingCustomer: false,
};

function generateShortId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return id;
}

function resetApplication() {
    state.currentCustomer = null;
    state.currentOrder = null;
    state.currentBalance = null;
    state.isEditingCustomer = false;
    ui.resetOrderView(true);
}

function recalculateOrderTotals() {
    if (!state.currentOrder) return;
    state.currentOrder.total_amount = state.currentOrder.items.reduce((sum, item) => sum + Math.round((item.unit_price || 0) * (item.quantity || 0)), 0);
}

function recalculateAndRender() {
    if (!state.currentOrder) {
        if(state.currentCustomer) {
             ui.renderPaymentPane(null, state.currentBalance, handleRemoveStagedPayment);
        }
        return;
    };
    recalculateOrderTotals();
    ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder, handleQuantityChange, handleRemoveStagedPayment, state.currentBalance);
}

async function loadOrder(orderId) {
    if (!orderId) return;
    ui.showLoading(true);
    try {
        const foundOrder = await api.getOrderDetails(orderId);
        if (!foundOrder) throw new Error('Pedido não encontrado.');
        
        const customerDetails = await api.getCustomerDetails(foundOrder.customer_id);
        
        state.currentOrder = { ...foundOrder, stagedPayments: [] };
        state.currentCustomer = customerDetails.details;
        state.currentBalance = customerDetails.balance;
        
        ui.renderCustomerInfo(state.currentCustomer, state.currentBalance);
        recalculateAndRender();
        ui.showMessage('Pedido carregado com sucesso!', 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
        document.getElementById('order-search-input').value = '';
    }
}

async function selectCustomer(customerId) {
    ui.clearCustomerSuggestions();
    ui.showLoading(true);
    try {
        const customerDetails = await api.getCustomerDetails(customerId);
        state.currentCustomer = customerDetails.details;
        state.currentBalance = customerDetails.balance;
        state.currentOrder = null;
        ui.renderCustomerInfo(state.currentCustomer, state.currentBalance);
        ui.resetOrderView(false);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

function createNewOrderInMemory() {
    if (!state.currentCustomer) return ui.showMessage('Selecione um cliente para iniciar um novo pedido.', 'error');
    state.currentOrder = {
        isNew: true,
        order_id: '#NOVO',
        customer_id: state.currentCustomer.customer_id,
        items: [],
        execution_status: 'EM_EXECUCAO',
        payment_status: 'AGUARDANDO_PAGAMENTO',
        pickup_datetime: '',
        completed_at: null,
        paid_at: null,
        total_amount: 0,
        stagedPayments: [],
    };
    recalculateAndRender();
    ui.showMessage('Novo pedido iniciado. Adicione itens e salve.', 'success');
}

async function handleCustomerSubmit(event) {
    event.preventDefault();
    const customerData = ui.getNewCustomerFormData();
    if (!customerData.name) return ui.showMessage('Nome é obrigatório.', 'error');
    ui.showLoading(true);
    try {
        let customerIdToSelect;
        if (state.isEditingCustomer) {
            const updatedCustomerData = await api.updateCustomer(state.currentCustomer.customer_id, customerData);
            customerIdToSelect = updatedCustomerData.details.customer_id;
            ui.showMessage('Cliente atualizado!', 'success');
        } else {
            const newCustomer = await api.createCustomer(customerData);
            customerIdToSelect = newCustomer.customer_id;
            ui.showMessage('Cliente criado!', 'success');
        }
        ui.toggleModal('new-customer-modal', false);
        await selectCustomer(customerIdToSelect);
    } catch (err) {
        ui.showMessage(err.message, 'error');
    } finally {
        state.isEditingCustomer = false;
        ui.showLoading(false);
    }
}

function handleAddProductToOrder(product) {
    if (!state.currentCustomer) return ui.showMessage('Por favor, selecione um cliente primeiro.', 'error');
    if (!state.currentOrder) createNewOrderInMemory();
    state.currentOrder.items.push({
        order_item_id: `temp_item_${Date.now()}`,
        product_id: product.product_id,
        product_name: product.name,
        quantity: product.unit_of_measure === 'KG' ? 1.0 : 1,
        unit_price: product.price,
        unit_of_measure: product.unit_of_measure,
    });
    recalculateAndRender();
}

function handleRemoveItemFromOrder(orderItemId) {
    if (!state.currentOrder) return;
    state.currentOrder.items = state.currentOrder.items.filter(item => item.order_item_id != orderItemId);
    recalculateAndRender();
}

function handleQuantityChange(orderItemId, newQuantity) {
    if (!state.currentOrder || newQuantity < 0) return;
    const item = state.currentOrder.items.find(i => i.order_item_id == orderItemId);
    if (item) {
        item.quantity = newQuantity;
        recalculateAndRender();
    }
}

function handleStatusChange(type, newStatus) {
    if (!state.currentOrder) return;
    if (type === 'execution') {
        state.currentOrder.execution_status = newStatus;
        if (newStatus === 'CONCLUIDO' && !document.getElementById('completed-at-input').value) {
            document.getElementById('completed-at-input').value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
    }
    recalculateAndRender();
}

function handlePaymentMethodClick(method) {
    if (!state.currentOrder || !state.currentCustomer) return;
    recalculateOrderTotals();
    const total = state.currentOrder.total_amount;
    const totalPaid = state.currentOrder.stagedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total - totalPaid;
    if (remaining <= 0) return ui.showMessage('O valor do pedido já foi totalmente coberto.', 'info');

    let amountToPay = 0;
    if (method === 'Saldo') {
        const balanceAvailable = state.currentBalance.totalBalance;
        amountToPay = Math.min(remaining, balanceAvailable);
    } else {
        const input = prompt(`Valor a pagar com ${method} (em centavos):`, remaining);
        if (input === null) return;
        amountToPay = parseInt(input, 10);
        if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > remaining) {
            return ui.showMessage('Valor de pagamento inválido.', 'error');
        }
    }
    if (amountToPay > 0) {
        state.currentOrder.stagedPayments.push({ id: `pay_${Date.now()}`, method, amount: amountToPay });
        const paidAtInput = document.getElementById('payment-date-input');
        if (!paidAtInput.value) {
            paidAtInput.value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
        recalculateAndRender();
    }
}

function handleRemoveStagedPayment(paymentId) {
    if (!state.currentOrder) return;
    state.currentOrder.stagedPayments = state.currentOrder.stagedPayments.filter(p => p.id !== paymentId);
    recalculateAndRender();
}

async function handleSaveOrder() {
    if (!state.currentOrder) return ui.showMessage('Nenhum pedido ativo para salvar.', 'error');
    if (state.currentOrder.isNew) {
        state.currentOrder.order_id = generateShortId();
        delete state.currentOrder.isNew;
    }
    state.currentOrder.pickup_datetime = document.getElementById('pickup-datetime-input').value || null;
    state.currentOrder.completed_at = document.getElementById('completed-at-input').value || null;
    state.currentOrder.paid_at = document.getElementById('payment-date-input').value || null;
    recalculateOrderTotals();
    ui.showLoading(true);
    try {
        const savedOrder = await api.saveOrder(state.currentOrder);
        await loadOrder(savedOrder.order_id);
        ui.showMessage(`Pedido #${savedOrder.order_id} salvo com sucesso!`, 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
        if (!state.currentOrder.created_at) {
            state.currentOrder.isNew = true;
            state.currentOrder.order_id = '#NOVO';
        }
    } finally {
        ui.showLoading(false);
    }
}

async function handleViewCustomerOrders() {
    if (!state.currentCustomer) return;
    ui.showLoading(true);
    try {
        const orders = await api.getOrdersByCustomer(state.currentCustomer.customer_id);
        ui.renderCustomerOrdersModal(state.currentCustomer, orders, (selectedOrderId) => {
            loadOrder(selectedOrderId);
            ui.toggleModal('customer-orders-modal', false);
        });
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

function handleEditCustomerClick() {
    if (!state.currentCustomer) return;
    state.isEditingCustomer = true;
    ui.populateCustomerModal(state.currentCustomer);
    ui.toggleModal('new-customer-modal', true);
}

async function init() {
    console.log("Inicializando PDV...");
    
    document.getElementById('customer-search-input').addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        setTimeout(async () => {
            const searchTerm = e.target.value;
            if (searchTerm.length > 1) {
                try {
                    const customers = await api.searchCustomers(searchTerm);
                    ui.renderCustomerSuggestions(customers, selectCustomer);
                } catch (error) { ui.showMessage(error.message, 'error'); }
            } else {
                ui.clearCustomerSuggestions();
            }
        }, 300);
    });

    const orderSearchInput = document.getElementById('order-search-input');
    orderSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        const searchTerm = e.target.value.trim().toUpperCase();
        if (searchTerm.length === 0) return ui.clearOrderSuggestions();
        setTimeout(async () => {
            try {
                const orders = await api.searchOrders(searchTerm);
                ui.renderOrderSuggestions(orders, (selectedOrderId) => {
                    loadOrder(selectedOrderId);
                    ui.clearOrderSuggestions();
                });
            } catch (error) { ui.showMessage(error.message, 'error'); }
        }, 300);
    });
    orderSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ui.clearOrderSuggestions();
            loadOrder(orderSearchInput.value.trim().toUpperCase());
        }
    });

    document.getElementById('new-order-btn').addEventListener('click', createNewOrderInMemory);
    document.getElementById('save-order-btn').addEventListener('click', handleSaveOrder);
    document.getElementById('view-customer-orders-btn').addEventListener('click', handleViewCustomerOrders);
    document.getElementById('edit-customer-btn').addEventListener('click', handleEditCustomerClick);
    
    document.getElementById('new-customer-btn').addEventListener('click', () => {
        state.isEditingCustomer = false;
        ui.populateCustomerModal(null);
        ui.toggleModal('new-customer-modal', true);
    });
    document.getElementById('new-customer-form').addEventListener('submit', handleCustomerSubmit);
    
    document.getElementById('new-customer-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('new-customer-modal', false));
    document.getElementById('customer-orders-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('customer-orders-modal', false));
    
    document.getElementById('execution-status-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button')) handleStatusChange('execution', e.target.dataset.status);
    });
    
    document.getElementById('payment-methods').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button')) {
            handlePaymentMethodClick(e.target.dataset.method);
        }
    });
    
    document.getElementById('staged-payments-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-payment-btn')) {
            handleRemoveStagedPayment(e.target.dataset.paymentId);
        }
    });

    ui.showLoading(true);
    try {
        const initialData = await api.getInitialData();
        state.products = initialData.products;
        state.categories = initialData.categories;
        ui.renderCategories(state.categories, (category) => ui.filterProducts(category));
        ui.renderProducts(state.products, handleAddProductToOrder);
    } catch (error) {
        ui.showMessage(error.message, 'error');
        console.error("Falha ao carregar dados iniciais:", error);
    } finally {
        ui.showLoading(false);
    }
}

document.addEventListener('DOMContentLoaded', init);