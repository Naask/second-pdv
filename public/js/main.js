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

/**
 * Centraliza a tarefa de renderizar o pedido atual na UI.
 */
function renderCurrentOrder() {
    if (state.currentOrder) {
        ui.renderOrder(state.currentOrder, state.currentBalance, {
            onRemoveItem: handleRemoveItemFromOrder,
            onQuantityChange: handleQuantityChange,
            onRemoveStagedPayment: handleRemoveStagedPayment,
        });
    }
}

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

/**
 * Recalcula o valor total do pedido e chama a função para redesenhar a interface.
 */
function recalculateOrderTotals() {
    if (!state.currentOrder) return;

    state.currentOrder.total_amount = state.currentOrder.items.reduce((sum, item) => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        return sum + Math.round(itemTotal);
    }, 0);

    renderCurrentOrder();
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
        renderCurrentOrder();
        ui.showMessage('Pedido carregado com sucesso!', 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
        document.getElementById('order-search-input').value = '';
        ui.clearOrderSuggestions();
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
        payments: [],
        stagedPayments: [],
        execution_status: 'EM_EXECUCAO',
        payment_status: 'AGUARDANDO_PAGAMENTO',
        pickup_datetime: '',
        completed_at: null,
        paid_at: null,
        total_amount: 0,
    };
    renderCurrentOrder();
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
        temp_id: `temp_${Date.now()}`,
        product_id: product.product_id,
        product_name: product.name,
        quantity: product.unit_of_measure === 'KG' ? 1.0 : 1,
        unit_price: product.price,
        unit_of_measure: product.unit_of_measure,
    });
    recalculateOrderTotals();
}

function handleRemoveItemFromOrder(orderItemId) {
    if (!state.currentOrder) return;
    state.currentOrder.items = state.currentOrder.items.filter(item => {
        const idToCompare = item.order_item_id || item.temp_id;
        return String(idToCompare) !== String(orderItemId);
    });
    recalculateOrderTotals();
}

function handleQuantityChange(orderItemId, newQuantity) {
    if (!state.currentOrder) return;
    const newQty = parseFloat(newQuantity);
    if (isNaN(newQty) || newQty < 0) return;

    const item = state.currentOrder.items.find(i => {
        const idToCompare = i.order_item_id || i.temp_id;
        return String(idToCompare) === String(orderItemId);
    });

    if (item) {
        item.quantity = newQty;
    }
    recalculateOrderTotals();
}

function handleStatusChange(type, newStatus) {
    if (!state.currentOrder) return;

    if (type === 'execution') {
        state.currentOrder.execution_status = newStatus;
        if (newStatus === 'CONCLUIDO' && !state.currentOrder.completed_at) {
            state.currentOrder.completed_at = ui.getISODateString();
        }
    }
    renderCurrentOrder();
}

/**
 * NOVA FUNÇÃO
 * Lida com o envio do formulário de adicionar crédito.
 */
async function handleAddCreditSubmit(event) {
    event.preventDefault(); // Impede o recarregamento da página
    if (!state.currentCustomer) return;

    const form = event.target;
    const amount = parseInt(form.querySelector('#credit-amount').value, 10);

    if (isNaN(amount) || amount <= 0) {
        return ui.showMessage('Por favor, insira um valor de crédito válido em centavos.', 'error');
    }

    ui.showLoading(true);
    try {
        await api.addCredit(state.currentCustomer.customer_id, { amount, description: 'Crédito adicionado manualmente' });
        ui.showMessage('Crédito adicionado com sucesso!');
        ui.toggleModal('add-credit-modal', false);
        // Recarrega os dados do cliente para atualizar o saldo na tela
        await selectCustomer(state.currentCustomer.customer_id);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * NOVA FUNÇÃO
 * Lida com o envio do formulário de comprar pacote.
 */
async function handleAddPackageSubmit(event) {
    event.preventDefault(); // Impede o recarregamento da página
    if (!state.currentCustomer) return;

    const form = event.target;
    const paidAmount = parseInt(form.querySelector('#package-paid-amount').value, 10);
    const bonusAmount = parseInt(form.querySelector('#package-bonus-amount').value, 10);

    if (isNaN(paidAmount) || paidAmount <= 0 || isNaN(bonusAmount) || bonusAmount < 0) {
        return ui.showMessage('Por favor, insira valores válidos para o pacote em centavos.', 'error');
    }

    ui.showLoading(true);
    try {
        await api.addPrepaidPackage(state.currentCustomer.customer_id, { paidAmount, bonusAmount });
        ui.showMessage('Pacote comprado com sucesso!');
        ui.toggleModal('add-package-modal', false);
        // Recarrega os dados do cliente para atualizar o saldo na tela
        await selectCustomer(state.currentCustomer.customer_id);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

function handleAddPayment(method) {
    if (!state.currentOrder) return;

    const { total_amount = 0, payments = [], stagedPayments = [] } = state.currentOrder;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalStaged = stagedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total_amount - totalPaid - totalStaged;

    if (remaining <= 0) {
        return ui.showMessage("O pedido já está totalmente pago.", "error");
    }

    let amountToPay = remaining;
    if (method.toUpperCase() === 'SALDO') {
        const customerBalance = state.currentBalance?.totalBalance || 0;
        if (customerBalance <= 0) {
            return ui.showMessage(`Cliente não possui saldo.`, 'error');
        }
        amountToPay = Math.min(customerBalance, remaining);
    }
    
    stagedPayments.push({
        id: `staged_${Date.now()}`,
        method: method,
        amount: amountToPay,
    });
    
    if (!state.currentOrder.paid_at) {
        state.currentOrder.paid_at = ui.getISODateString();
    }
    renderCurrentOrder();
}

function handleRemoveStagedPayment(paymentId) {
    if (!state.currentOrder) return;
    state.currentOrder.stagedPayments = state.currentOrder.stagedPayments.filter(p => p.id !== paymentId);
    renderCurrentOrder();
}

async function handleSaveOrder() {
    if (!state.currentOrder) return ui.showMessage('Nenhum pedido ativo para salvar.', 'error');
    if (state.currentOrder.isNew) {
        state.currentOrder.order_id = generateShortId();
        delete state.currentOrder.isNew;
    }

    const finalPayments = [
        ...(state.currentOrder.payments || []),
        ...state.currentOrder.stagedPayments.map(p => ({
            method: p.method,
            amount: p.amount,
            paid_at: state.currentOrder.paid_at || ui.getISODateString()
        }))
    ];

    const orderPayload = {
        ...state.currentOrder,
        payments: finalPayments,
    };
    delete orderPayload.stagedPayments;
    
    ui.showLoading(true);
    try {
        const savedOrder = await api.saveOrder(orderPayload);
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


/**
 * Abre uma nova janela para o recibo e envia os dados do pedido,
 * cliente e saldo para ela.
 */
function handlePrintReceipt() {
    if (!state.currentOrder || !state.currentCustomer || !state.currentBalance || state.currentOrder.isNew) {
        return ui.showMessage('Selecione um pedido salvo para imprimir.', 'error');
    }

    const receiptWindow = window.open('receipt.html', 'Recibo', 'width=640,height=1200,scrollbars=yes');
    
    // Espera a janela carregar para enviar os dados
    receiptWindow.onload = () => {
        receiptWindow.postMessage({ 
            order: state.currentOrder, 
            customer: state.currentCustomer,
            balance: state.currentBalance // Adicionada a informação do saldo
        }, window.location.origin);
    };
}

/**
 * FUNÇÃO SUBSTITUÍDA
 * Inicializa todos os listeners de eventos da aplicação.
 */
async function init() {
    console.log("Inicializando PDV...");
    
    // Listener para busca de clientes
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

    // Listener para busca de pedidos
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

    // Listeners para botões de ação principais
    document.getElementById('new-order-btn').addEventListener('click', resetApplication);
    document.getElementById('save-order-btn').addEventListener('click', handleSaveOrder);
    document.getElementById('print-receipt-btn').addEventListener('click', handlePrintReceipt);
    document.getElementById('view-customer-orders-btn').addEventListener('click', handleViewCustomerOrders);
    document.getElementById('edit-customer-btn').addEventListener('click', handleEditCustomerClick);
    document.getElementById('new-customer-btn').addEventListener('click', () => {
        state.isEditingCustomer = false;
        ui.populateCustomerModal(null);
        ui.toggleModal('new-customer-modal', true);
    });
    
    // **LISTENERS CORRIGIDOS/ADICIONADOS**
    // Adiciona listeners para os botões de crédito e pacote
    document.getElementById('add-credit-btn').addEventListener('click', () => {
        if (!state.currentCustomer) return;
        document.getElementById('add-credit-form').reset();
        ui.toggleModal('add-credit-modal', true);
    });

    document.getElementById('add-package-btn').addEventListener('click', () => {
        if (!state.currentCustomer) return;
        document.getElementById('add-package-form').reset();
        ui.toggleModal('add-package-modal', true);
    });

    // Listeners para submissão de formulários
    document.getElementById('new-customer-form').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('add-credit-form').addEventListener('submit', handleAddCreditSubmit);
    document.getElementById('add-package-form').addEventListener('submit', handleAddPackageSubmit);
    
    // Listeners para fechar todos os modais
    document.getElementById('new-customer-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('new-customer-modal', false));
    document.getElementById('customer-orders-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('customer-orders-modal', false));
    document.getElementById('add-credit-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('add-credit-modal', false));
    document.getElementById('add-package-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('add-package-modal', false));
    
    // Listeners para painel de ações do pedido
    document.getElementById('execution-status-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button')) handleStatusChange('execution', e.target.dataset.status);
    });
    
    document.getElementById('payment-methods').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button') && !e.target.disabled) {
            handleAddPayment(e.target.dataset.method);
        }
    });
    
    document.getElementById('staged-payments-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-payment-btn')) {
            handleRemoveStagedPayment(e.target.dataset.paymentId);
        }
    });

    // Listeners para os campos de data
    document.getElementById('pickup-datetime-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.pickup_datetime = e.target.value;
    });
    document.getElementById('completed-at-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.completed_at = e.target.value;
    });
    document.getElementById('paid-at-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.paid_at = e.target.value;
    });

    // Carregamento inicial de dados
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
    
    resetApplication();
}

document.addEventListener('DOMContentLoaded', init);