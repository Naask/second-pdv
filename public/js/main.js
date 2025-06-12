// public/js/main.js
// Módulo principal que orquestra toda a aplicação no frontend.

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

// --- Funções de Manipulação de Estado e Lógica ---

/**
 * Reseta o estado da aplicação para um novo pedido.
 */
function resetApplication() {
    state.currentCustomer = null;
    state.currentOrder = null;
    ui.resetOrderView();
}

/**
 * Lida com a busca de um pedido específico pelo seu ID completo.
 * @param {string} orderId - O ID completo do pedido a ser buscado.
 */
async function handleSearchOrder(orderId) {
    // --- LINHA DE DEPURAÇÃO ---
    // Vamos verificar o que estamos recebendo exatamente.
    console.log("Tentando buscar detalhes para o Order ID:", `'${orderId}'`, "| Tipo:", typeof orderId);
    
    if (!orderId) {
        console.log("Busca cancelada: orderId está vazio.");
        return;
    }

    ui.showLoading(true);
    try {
        const foundOrder = await api.getOrderDetails(orderId);
        state.currentOrder = foundOrder;

        const customerDetails = await api.getCustomerDetails(foundOrder.customer_id);
        state.currentCustomer = customerDetails.details;
        
        ui.renderCustomerInfo(state.currentCustomer, customerDetails.balance);
        ui.renderOrder(state.currentOrder, handleRemoveItem);
        ui.showMessage('Pedido carregado com sucesso!', 'success');

    } catch (error) {
        ui.showMessage('Pedido não encontrado.', 'error');
        console.error("Erro capturado em handleSearchOrder:", error); // Adiciona mais detalhes do erro no console
    } finally {
        ui.showLoading(false);
        document.getElementById('order-search-input').value = '';
    }
}


/**
 * Lida com a seleção de um cliente e a criação de um novo pedido para ele.
 * @param {string} customerId - O ID do cliente selecionado.
 */
async function selectCustomerAndCreateOrder(customerId) {
    ui.clearCustomerSuggestions();
    ui.showLoading(true);
    try {
        const customerDetails = await api.getCustomerDetails(customerId);
        state.currentCustomer = customerDetails.details;
        ui.renderCustomerInfo(state.currentCustomer, customerDetails.balance);
        
        const newOrder = await api.createOrder(customerId);
        state.currentOrder = newOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItem);

    } catch (error) {
        ui.showMessage(error.message, 'error');
        resetApplication();
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com a adição de um produto ao pedido atual.
 * @param {object} product - O objeto do produto selecionado.
 */
async function handleAddProductToOrder(product) {
    if (!state.currentOrder || !state.currentCustomer) {
        ui.showMessage('Por favor, selecione um cliente primeiro.', 'error');
        return;
    }

    let quantity = 1;
    if (product.unit_of_measure === 'KG') {
        const input = prompt(`Digite a quantidade em KG para "${product.name}":`, '1.0');
        if (input === null) return;
        quantity = parseFloat(input.replace(',', '.')) || 0;
        if (quantity <= 0) {
            ui.showMessage('Quantidade inválida.', 'error');
            return;
        }
    }
    
    ui.showLoading(true);
    try {
        const updatedOrder = await api.addItemToOrder(state.currentOrder.order_id, {
            productId: product.product_id,
            quantity: quantity,
        });
        state.currentOrder = updatedOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItem);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com a remoção de um item do pedido.
 * @param {string} orderItemId - O ID do item a ser removido.
 */
async function handleRemoveItem(orderItemId) {
    if (!state.currentOrder) return;
    ui.showLoading(true);
    try {
        await api.removeItemFromOrder(state.currentOrder.order_id, orderItemId);
        const updatedOrder = await api.getOrderDetails(state.currentOrder.order_id);
        state.currentOrder = updatedOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItem);
        ui.showMessage('Item removido com sucesso.', 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com a mudança de status do pedido.
 * @param {string} newStatus - O novo status para o pedido.
 */
async function handleStatusChange(newStatus) {
    if (!state.currentOrder || state.currentOrder.status === newStatus) return;

    ui.showLoading(true);
    try {
        const updatedOrder = await api.updateOrderStatus(state.currentOrder.order_id, newStatus);
        state.currentOrder = updatedOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItem);
        ui.showMessage(`Status alterado para ${newStatus.replace('_', ' ')}`, 'success');
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com o pagamento do pedido usando o saldo do cliente.
 */
async function handlePayment() {
    if (!state.currentOrder || !state.currentCustomer) return;
    if (state.currentOrder.status === 'PAGO') {
        ui.showMessage('Este pedido já foi pago.', 'error');
        return;
    }

    if (!confirm(`Confirmar pagamento de ${ui.formatCurrency(state.currentOrder.total_amount)} para o pedido #${state.currentOrder.order_id}?`)) {
        return;
    }

    ui.showLoading(true);
    try {
        await api.processPaymentWithBalance(state.currentOrder.order_id);
        const updatedOrder = await api.getOrderDetails(state.currentOrder.order_id);
        const updatedCustomer = await api.getCustomerDetails(state.currentCustomer.customer_id);

        state.currentOrder = updatedOrder;
        state.currentCustomer = updatedCustomer.details;

        ui.renderOrder(state.currentOrder, handleRemoveItem);
        ui.renderCustomerInfo(state.currentCustomer, updatedCustomer.balance);
        ui.showMessage('Pagamento realizado com sucesso!', 'success');

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
    // --- Event Listeners ---
    const orderSearchInput = document.getElementById('order-search-input');
    const customerSearchInput = document.getElementById('customer-search-input');

    // Listener para busca interativa de CLIENTES
    customerSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(async () => {
            const searchTerm = e.target.value;
            if (searchTerm.length > 1) {
                const customers = await api.searchCustomers(searchTerm);
                ui.renderCustomerSuggestions(customers, selectCustomerAndCreateOrder);
            } else {
                ui.clearCustomerSuggestions();
            }
        }, 300);
    });

    // Listener para busca interativa de PEDIDOS (mostra sugestões)
    orderSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        const searchTerm = e.target.value.trim().toUpperCase();
        if (searchTerm.length === 0) {
            ui.clearOrderSuggestions();
            return;
        }
        state.debounceTimer = setTimeout(async () => {
            try {
                const orders = await api.searchOrders(searchTerm);
                ui.renderOrderSuggestions(orders, (selectedOrderId) => {
                    handleSearchOrder(selectedOrderId);
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
            e.preventDefault(); // Evita envio de formulário
            ui.clearOrderSuggestions();
            handleSearchOrder(orderSearchInput.value.trim().toUpperCase());
        }
    });

    document.getElementById('new-customer-btn').addEventListener('click', () => ui.toggleModal('new-customer-modal', true));
    document.getElementById('new-customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = ui.getNewCustomerFormData();
        if (!data.name) return ui.showMessage('Nome é obrigatório.', 'error');
        
        ui.showLoading(true);
        const newCustomer = await api.createCustomer(data);
        ui.toggleModal('new-customer-modal', false);
        ui.clearForm(e.target);
        ui.showMessage('Cliente criado!', 'success');
        selectCustomerAndCreateOrder(newCustomer.customer_id);
    });
    
    document.getElementById('new-order-btn').addEventListener('click', resetApplication);
    document.getElementById('pay-order-btn').addEventListener('click', handlePayment);
    document.getElementById('order-status-options').addEventListener('click', (e) => {
        if(e.target.classList.contains('option-button')) {
            handleStatusChange(e.target.dataset.status);
        }
    });

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
    } finally {
        ui.showLoading(false);
    }
    
    resetApplication();
}

// Ponto de entrada
document.addEventListener('DOMContentLoaded', init);