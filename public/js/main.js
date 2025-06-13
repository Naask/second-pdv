// public/js/main.js - VERSÃO FINAL CORRIGIDA (SALVAMENTO EXPLÍCITO + BUSCA DE PEDIDO)

import * as api from './api.js';
import * as ui from './ui.js';

// --- Estado Central da Aplicação ---
const state = {
    products: [],
    categories: [],
    currentCustomer: null,
    currentOrder: null,
    debounceTimer: null,
};

// --- Funções Utilitárias ---
function generateShortId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return id;
}

// --- Funções de Lógica e Manipulação de Estado (Handlers) ---

function resetApplication() {
    state.currentCustomer = null;
    state.currentOrder = null;
    ui.resetOrderView();
    document.getElementById('customer-search-input').value = '';
    document.getElementById('order-search-input').value = '';
    document.getElementById('pickup-datetime-input').value = '';
}

/**
 * Busca um pedido existente e o carrega no estado da aplicação.
 * @param {string} orderId - O ID completo do pedido.
 */
async function loadOrder(orderId) {
    if (!orderId) return;
    ui.showLoading(true);
    try {
        const foundOrder = await api.getOrderDetails(orderId);
        if (!foundOrder) throw new Error('Pedido não encontrado.');

        const customerDetails = await api.getCustomerDetails(foundOrder.customer_id);
        
        state.currentOrder = foundOrder;
        state.currentCustomer = customerDetails.details;
        
        ui.renderCustomerInfo(state.currentCustomer, customerDetails.balance);
        ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
        ui.showMessage('Pedido carregado com sucesso!', 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
        document.getElementById('order-search-input').value = '';
    }
}

/**
 * Cria um novo pedido em memória para o cliente selecionado.
 * @param {object} customer - O objeto do cliente.
 * @param {object} balance - O objeto de saldo do cliente.
 */
function createNewOrderInMemory(customer, balance) {
    state.currentCustomer = customer;
    state.currentOrder = {
        order_id: generateShortId(),
        customer_id: customer.customer_id,
        items: [],
        execution_status: 'AGUARDANDO_EXECUCAO',
        payment_status: 'AGUARDANDO_PAGAMENTO',
        pickup_datetime: '',
        total_amount: 0,
    };
    ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
    ui.renderCustomerInfo(customer, balance);
}

async function selectCustomer(customerId) {
    ui.clearCustomerSuggestions();
    ui.showLoading(true);
    try {
        const customerDetails = await api.getCustomerDetails(customerId);
        createNewOrderInMemory(customerDetails.details, customerDetails.balance);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

function handleAddProductToOrder(product) {
    if (!state.currentOrder) return ui.showMessage('Selecione um cliente para iniciar um pedido.', 'error');
    state.currentOrder.items.push({
        order_item_id: `temp_item_${Date.now()}`,
        product_id: product.product_id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
    });
    ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
}

function handleRemoveItemFromOrder(orderItemId) {
    if (!state.currentOrder) return;
    state.currentOrder.items = state.currentOrder.items.filter(item => item.order_item_id != orderItemId);
    ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
}

function handleStatusChange(type, newStatus) {
    if (!state.currentOrder) return;
    if (type === 'execution') state.currentOrder.execution_status = newStatus;
    if (type === 'payment') state.currentOrder.payment_status = newStatus;
    ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
}

async function handleSaveOrder() {
    if (!state.currentOrder) return ui.showMessage('Nenhum pedido ativo para salvar.', 'error');
    
    state.currentOrder.pickup_datetime = document.getElementById('pickup-datetime-input').value || null;

    ui.showLoading(true);
    try {
        const savedOrder = await api.saveOrder(state.currentOrder);
        state.currentOrder = savedOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItemFromOrder);
        ui.showMessage(`Pedido #${savedOrder.order_id} salvo com sucesso!`, 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Função de inicialização da aplicação.
 */
async function init() {
    console.log("Inicializando PDV...");

    // --- Configuração dos Event Listeners ---
    const customerSearchInput = document.getElementById('customer-search-input');
    const orderSearchInput = document.getElementById('order-search-input');

    // Listener para busca de CLIENTES
    customerSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(async () => {
            const searchTerm = e.target.value;
            if (searchTerm.length > 1) {
                const customers = await api.searchCustomers(searchTerm);
                ui.renderCustomerSuggestions(customers, selectCustomer);
            } else {
                ui.clearCustomerSuggestions();
            }
        }, 300);
    });

    // Listener para busca de PEDIDOS (interativo)
    orderSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        const searchTerm = e.target.value.trim().toUpperCase();
        if (searchTerm.length === 0) {
            return ui.clearOrderSuggestions();
        }
        state.debounceTimer = setTimeout(async () => {
            try {
                const orders = await api.searchOrders(searchTerm);
                ui.renderOrderSuggestions(orders, (selectedOrderId) => {
                    loadOrder(selectedOrderId);
                    ui.clearOrderSuggestions();
                });
            } catch (error) {
                ui.showMessage(error.message, 'error');
            }
        }, 300);
    });

    // Listener para buscar pedido ao pressionar ENTER
    orderSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ui.clearOrderSuggestions();
            loadOrder(orderSearchInput.value.trim().toUpperCase());
        }
    });

    document.getElementById('new-order-btn').addEventListener('click', resetApplication);
    document.getElementById('save-order-btn').addEventListener('click', handleSaveOrder);
    
    document.getElementById('execution-status-options').addEventListener('click', (e) => {
        if(e.target.classList.contains('option-button')) handleStatusChange('execution', e.target.dataset.status);
    });
    document.getElementById('payment-status-options').addEventListener('click', (e) => {
        if(e.target.classList.contains('option-button')) handleStatusChange('payment', e.target.dataset.status);
    });

    // (Outros listeners como o de novo cliente podem ser adicionados aqui)

    // --- Carregamento de Dados Iniciais ---
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

// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', init);