// public/js/main.js
import * as api from './api.js';
import * as ui from './ui.js';

const state = {
    products: [], categories: [], currentCustomer: null, currentBalance: null,
    currentOrder: null, debounceTimer: null, isEditingCustomer: false,
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

/**
 * Recalcula o valor total do pedido e chama a função para redesenhar a interface.
 */
function recalculateOrderTotals() {
    if (!state.currentOrder) return;

    // Soma o subtotal de todos os itens para obter o total geral do pedido
    state.currentOrder.total_amount = state.currentOrder.items.reduce((sum, item) => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        return sum + Math.round(itemTotal);
    }, 0);

    // Dispara a renderização da tela com os novos dados
    renderCurrentOrder();
}

// NOVA FUNÇÃO
/**
 * Renderiza o pedido atual na UI, passando os callbacks necessários.
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

// FUNÇÃO MODIFICADA
async function loadOrder(orderId) {
    if (!orderId) return;
    ui.showLoading(true);
    try {
        const foundOrder = await api.getOrderDetails(orderId);
        if (!foundOrder) throw new Error('Pedido não encontrado.');
        
        const customerDetails = await api.getCustomerDetails(foundOrder.customer_id);
        
        // Modificado para incluir o array de 'stagedPayments'
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

// FUNÇÃO MODIFICADA
function createNewOrderInMemory() {
    if (!state.currentCustomer) return ui.showMessage('Selecione um cliente para iniciar um novo pedido.', 'error');
    
    // Modificado para incluir os arrays de pagamentos
    state.currentOrder = {
        isNew: true, order_id: '#NOVO', customer_id: state.currentCustomer.customer_id, 
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
            ui.showMessage('Cliente atualizado com sucesso!', 'success');
        } else {
            const newCustomer = await api.createCustomer(customerData);
            customerIdToSelect = newCustomer.customer_id;
            ui.showMessage('Cliente criado com sucesso!', 'success');
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

/**
 * Adiciona um produto selecionado ao pedido atual.
 */
function handleAddProductToOrder(product) {
    // Validação inicial
    if (!state.currentCustomer) {
        return ui.showMessage('Por favor, selecione um cliente primeiro.', 'error');
    }
    // Se não houver um pedido na tela, cria um novo
    if (!state.currentOrder) {
        createNewOrderInMemory();
    }

    // Adiciona o novo item à lista de itens do pedido na memória
    state.currentOrder.items.push({
        temp_id: `temp_${Date.now()}`, // Cria um ID temporário e único
        product_id: product.product_id,
        product_name: product.name,
        quantity: product.unit_of_measure === 'KG' ? 1.0 : 1,
        unit_price: product.price,
        unit_of_measure: product.unit_of_measure,
    });
    
    // Recalcula os totais e redesenha a tela para mostrar o novo item
    recalculateOrderTotals();
}

// FUNÇÃO MODIFICADA
function handleRemoveItemFromOrder(itemId) {
    if (!state.currentOrder) return;
    state.currentOrder.items = state.currentOrder.items.filter(item => (item.order_item_id || item.temp_id) != itemId);
    recalculateOrderTotals();
}

// FUNÇÃO MODIFICADA
/**
 * Lida com a mudança de quantidade de um item no pedido.
 * Esta função atualiza a quantidade do item na memória (no objeto 'state').
 */
/**
 * Lida com a mudança de quantidade de um item no pedido.
 */
function handleQuantityChange(itemId, newQuantity) {
    if (!state.currentOrder) return;

    // Converte a nova quantidade para número e valida
    const newQty = parseFloat(newQuantity);
    if (isNaN(newQty) || newQty < 0) {
        // Se a quantidade for inválida, não faz nada ou poderia resetar para 0
        return; 
    }

    // **LÓGICA DE BUSCA CORRIGIDA E MAIS ROBUSTA**
    // Converte ambos os IDs para string antes de comparar,
    // o que evita problemas de tipo entre o ID numérico (ex: 5) e o ID de texto (ex: "temp_12345").
    const item = state.currentOrder.items.find(i => {
        const idToCompare = i.order_item_id || i.temp_id;
        return String(idToCompare) === String(itemId);
    });

    if (item) {
        // Atualiza a quantidade do item encontrado na memória
        item.quantity = newQty;
    }

    // Dispara o recálculo dos totais e o redesenho da interface
    recalculateOrderTotals();
}

/**
 * Lida com a mudança de status de execução do pedido.
 */
function handleStatusChange(type, newStatus) {
    if (!state.currentOrder) return;

    if (type === 'execution') {
        state.currentOrder.execution_status = newStatus;

        // **LÓGICA CORRIGIDA**
        // Se o status for CONCLUIDO e a data ainda não estiver na memória...
        if (newStatus === 'CONCLUIDO' && !state.currentOrder.completed_at) {
            // ...atualizamos a data NA MEMÓRIA (state).
            state.currentOrder.completed_at = ui.getISODateString();
        }
    }
    
    // A função de renderização agora usará a data atualizada da memória para desenhar a tela.
    renderCurrentOrder();
}

// FUNÇÃO MODIFICADA
async function handleSaveOrder() {
    if (!state.currentOrder) {
        return ui.showMessage('Nenhum cliente ou pedido selecionado.', 'error');
    }
    if (state.currentOrder.isNew) {
        state.currentOrder.order_id = generateShortId();
        delete state.currentOrder.isNew;
    }

    const paidAt = document.getElementById('paid-at-input').value || ui.getISODateString();
    
    const finalPayments = [
        ...(state.currentOrder.payments || []),
        ...state.currentOrder.stagedPayments.map(p => ({
            method: p.method,
            amount: p.amount,
            paid_at: paidAt
        }))
    ];

    const orderPayload = {
        ...state.currentOrder,
        pickup_datetime: document.getElementById('pickup-datetime-input').value || null,
        completed_at: document.getElementById('completed-at-input').value || null,
        payments: finalPayments,
    };
    delete orderPayload.stagedPayments;
    
    ui.showLoading(true);
    try {
        const savedOrder = await api.saveOrder(orderPayload);
        state.currentOrder = { ...savedOrder, stagedPayments: [] };
        
        // Recarrega os detalhes do cliente para atualizar o saldo na tela
        const customerDetails = await api.getCustomerDetails(savedOrder.customer_id);
        state.currentCustomer = customerDetails.details;
        state.currentBalance = customerDetails.balance;
        ui.renderCustomerInfo(state.currentCustomer, state.currentBalance);

        renderCurrentOrder();
        ui.showMessage(`Pedido #${savedOrder.order_id} salvo com sucesso!`, 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
        if (!state.currentOrder.created_at) state.currentOrder.isNew = true;
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

// NOVA FUNÇÃO: Manipula a submissão do formulário de crédito
async function handleAddCreditSubmit(event) {
    event.preventDefault();
    if (!state.currentCustomer) return;

    const form = event.target;
    const amount = parseInt(form.querySelector('#credit-amount').value, 10);

    if (isNaN(amount) || amount <= 0) {
        return ui.showMessage('Por favor, insira um valor de crédito válido.', 'error');
    }

    ui.showLoading(true);
    try {
        await api.addCredit(state.currentCustomer.customer_id, { amount });
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

// NOVA FUNÇÃO: Manipula a submissão do formulário de pacote
async function handleAddPackageSubmit(event) {
    event.preventDefault();
    if (!state.currentCustomer) return;

    const form = event.target;
    const paidAmount = parseInt(form.querySelector('#package-paid-amount').value, 10);
    const bonusAmount = parseInt(form.querySelector('#package-bonus-amount').value, 10);

    if (isNaN(paidAmount) || paidAmount <= 0 || isNaN(bonusAmount) || bonusAmount < 0) {
        return ui.showMessage('Por favor, insira valores válidos para o pacote.', 'error');
    }

    ui.showLoading(true);
    try {
        await api.addPrepaidPackage(state.currentCustomer.customer_id, { paidAmount, bonusAmount });
        ui.showMessage('Pacote comprado com sucesso!');
        ui.toggleModal('add-package-modal', false);
        await selectCustomer(state.currentCustomer.customer_id);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

// NOVA FUNÇÃO
/**
 * Adiciona um pagamento à lista de preparação (staging) quando um método é selecionado.
 * @param {string} method - O método de pagamento (ex: 'Dinheiro', 'Pix').
 */
function handleAddPayment(method) {
    if (!state.currentOrder) return;

    const { total_amount = 0, payments = [], stagedPayments = [] } = state.currentOrder;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalStaged = stagedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total_amount - totalPaid - totalStaged;

    if (remaining <= 0) {
        return ui.showMessage("O pedido já está totalmente pago.", "error");
    }

    if (method.toUpperCase() === 'SALDO') {
        if (state.currentBalance.totalBalance <= 0) {
             return ui.showMessage(`Cliente não possui saldo.`, 'error');
        }
        // Usa o saldo disponível, limitado ao valor restante do pedido
        const amountToUse = Math.min(state.currentBalance.totalBalance, remaining);
         stagedPayments.push({
            id: `staged_${Date.now()}`,
            method: method,
            amount: amountToUse,
        });
    } else {
         stagedPayments.push({
            id: `staged_${Date.now()}`,
            method: method,
            amount: remaining,
        });
    }
    
    if (!document.getElementById('paid-at-input').value) {
        document.getElementById('paid-at-input').value = ui.getISODateString();
    }
    
    renderCurrentOrder();
}

// NOVA FUNÇÃO
/**
 * Remove um pagamento da lista de preparação (staging).
 * @param {string} paymentId - O ID temporário do pagamento a ser removido.
 */
function handleRemoveStagedPayment(paymentId) {
    if (!state.currentOrder) return;
    state.currentOrder.stagedPayments = state.currentOrder.stagedPayments.filter(p => p.id !== paymentId);
    renderCurrentOrder();
}


// FUNÇÃO MODIFICADA
async function init() {
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

    document.getElementById('new-order-btn').addEventListener('click', resetApplication);
    document.getElementById('save-order-btn').addEventListener('click', handleSaveOrder);
    document.getElementById('view-customer-orders-btn').addEventListener('click', handleViewCustomerOrders);
    
    document.getElementById('new-customer-btn').addEventListener('click', () => {
        state.isEditingCustomer = false;
        ui.populateCustomerModal(null);
        ui.toggleModal('new-customer-modal', true);
    });
    
    document.getElementById('edit-customer-btn').addEventListener('click', handleEditCustomerClick);
    document.getElementById('new-customer-form').addEventListener('submit', handleCustomerSubmit);
    
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

    document.getElementById('new-customer-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('new-customer-modal', false));
    document.getElementById('customer-orders-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('customer-orders-modal', false));
    document.getElementById('add-credit-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('add-credit-modal', false));
    document.getElementById('add-package-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('add-package-modal', false));
    
    document.getElementById('add-credit-form').addEventListener('submit', handleAddCreditSubmit);
    document.getElementById('add-package-form').addEventListener('submit', handleAddPackageSubmit);

    document.getElementById('execution-status-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button')) handleStatusChange('execution', e.target.dataset.status);
    });
    
        // --- ADICIONE ESTE BLOCO DE CÓDIGO ---
    // Listeners para os campos de data, para sincronizar com o state.
    document.getElementById('pickup-datetime-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.pickup_datetime = e.target.value;
    });

    document.getElementById('completed-at-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.completed_at = e.target.value;
    });

    document.getElementById('paid-at-input').addEventListener('input', (e) => {
        if (state.currentOrder) state.currentOrder.paid_at = e.target.value;
    });

    // Listener para os botões de método de pagamento
    document.getElementById('payment-methods').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-button') && !e.target.disabled) {
            handleAddPayment(e.target.dataset.method);
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
    resetApplication();
}

document.addEventListener('DOMContentLoaded', init);