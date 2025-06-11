// public/js/main.js
// Módulo principal que orquestra toda a aplicação no frontend.

import * as api from './api.js';
import * as ui from './ui.js';

// --- Estado Central da Aplicação ---
// Manter o estado em um único objeto ajuda na organização.
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
 * Lida com a seleção de um cliente e a criação de um novo pedido para ele.
 * @param {string} customerId - O ID do cliente selecionado.
 */
async function selectCustomerAndCreateOrder(customerId) {
    ui.clearCustomerSuggestions();
    ui.showLoading(true);
    try {
        // Busca os detalhes e o saldo do cliente
        const customerDetails = await api.getCustomerDetails(customerId);
        state.currentCustomer = customerDetails.details;
        ui.renderCustomerInfo(state.currentCustomer, customerDetails.balance);
        
        // Cria um novo pedido para o cliente selecionado
        const newOrder = await api.createOrder(customerId);
        state.currentOrder = newOrder;
        ui.renderOrder(state.currentOrder, handleRemoveItem);

    } catch (error) {
        ui.showMessage(error.message, 'error');
        resetApplication(); // Reseta em caso de erro
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

    // Para produtos por KG, podemos solicitar a quantidade com um prompt
    let quantity = 1;
    if (product.unit_of_measure === 'KG') {
        const input = prompt(`Digite a quantidade em KG para "${product.name}":`, '1.0');
        if (input === null) return; // Usuário cancelou
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
        // Após remover, busca o estado mais recente do pedido
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
    if (!state.currentOrder) return;
    if (state.currentOrder.status === newStatus) return; // Não faz nada se o status for o mesmo

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

    if (!confirm(`Confirmar pagamento de ${ui.formatCurrency(state.currentOrder.total_amount)} para o pedido #${state.currentOrder.order_id.substring(0,8)}?`)) {
        return;
    }

    ui.showLoading(true);
    try {
        await api.processPaymentWithBalance(state.currentOrder.order_id);
        // Atualiza tanto o pedido quanto o saldo do cliente na tela
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
    console.log("Inicializando PDV...");
    ui.showLoading(true);

    // Configura os event listeners
    document.getElementById('customer-search-input').addEventListener('input', (e) => {
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

    // Carrega dados iniciais
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

// Ponto de entrada: espera o DOM carregar para iniciar a aplicação.
document.addEventListener('DOMContentLoaded', init);