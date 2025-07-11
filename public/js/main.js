import * as api from './api.js';
import * as ui from './ui.js';

const state = {
    allProducts: [], // Guarda a lista de produtos com preço padrão
    products: [],      // Lista de produtos exibida na tela (pode ter preços de cliente)
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
    state.products = [...state.allProducts]; // Restaura a lista de produtos padrão
    ui.renderProducts(state.products, handleAddProductToOrder);
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
        
        // Antes de carregar o pedido, seleciona o cliente para carregar seus preços
        await selectCustomer(foundOrder.customer_id);

        state.currentOrder = { ...foundOrder, stagedPayments: [] };
        
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

/**
 * Busca os detalhes do cliente e a lista de produtos com os preços específicos para ele.
 */
async function selectCustomer(customerId) {
    ui.clearCustomerSuggestions();
    ui.showLoading(true);
    try {
        const customerDetails = await api.getCustomerDetails(customerId);
        const productsData = await api.getProductsForCustomer(customerId);

        state.currentCustomer = customerDetails.details;
        state.currentBalance = customerDetails.balance;
        state.products = productsData.products; // Atualiza com os preços do cliente
        state.currentOrder = null;

        ui.renderCustomerInfo(state.currentCustomer, state.currentBalance);
        ui.renderProducts(state.products, handleAddProductToOrder);
        ui.resetOrderView(false);
    } catch (error) {
        ui.showMessage(error.message, 'error');
        state.products = [...state.allProducts];
        ui.renderProducts(state.products, handleAddProductToOrder);
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
    ui.showMessage('Novo pedido iniciado. Adicione itens.', 'success');
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
        unit_price: product.price, // O preço já é o correto para o cliente
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

async function handleAddPackageSubmit(event) {
    event.preventDefault();
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
    console.log("--- Click no botão> handleViewCsut ---");
 
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
 * Filtra a lista de produtos exibida na tela com base no texto digitado.
 */
function handleProductSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // A lista de produtos a ser filtrada depende se um cliente está selecionado ou não
    const sourceProductList = state.currentCustomer ? state.products : state.allProducts;

    if (!searchTerm) {
        ui.renderProducts(sourceProductList, handleAddProductToOrder);
        return;
    }
    
    const filteredProducts = sourceProductList.filter(p => p.name.toLowerCase().includes(searchTerm));
    ui.renderProducts(filteredProducts, handleAddProductToOrder);
}

/**
 * FUNÇÃO ATUALIZADA E SIMPLIFICADA
 * Lida com o clique no botão "Gerenciar Preços", agora apenas com ordenação.
 */
async function handleManagePricesClick() {
    if (!state.currentCustomer) return;
    ui.showLoading(true);
    try {
        const customerProductsData = await api.getProductsForCustomer(state.currentCustomer.customer_id);
        
        // Ordena a lista de produtos padrão alfabeticamente
        const sortedProducts = [...state.allProducts].sort((a, b) => a.name.localeCompare(b.name));

        // Chama a função da UI para montar o modal com a lista já ordenada
        ui.renderPriceManagementModal(state.currentCustomer, sortedProducts, customerProductsData.products);

        // A lógica do event listener para o filtro foi removida

    } catch (error) {
        ui.showMessage("Erro ao carregar dados para gerenciar preços: " + error.message, "error");
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Salva a tabela de preços especiais do cliente.
 */
async function handleSavePrices() {
    if (!state.currentCustomer) return;

    const priceInputs = document.querySelectorAll('#customer-prices-tbody .special-price-input');
    const pricesToSave = [];
    
    priceInputs.forEach(input => {
        const priceValue = input.value.trim();
        const priceInCents = priceValue ? Math.round(parseFloat(priceValue.replace(',', '.')) * 100) : null;

        pricesToSave.push({
            product_id: parseInt(input.dataset.productId, 10),
            price: priceInCents,
        });
    });

    ui.showLoading(true);
    try {
        await api.saveCustomerPrices(state.currentCustomer.customer_id, pricesToSave);
        ui.showMessage("Tabela de preços atualizada com sucesso!");
        ui.toggleModal('price-management-modal', false);
        await selectCustomer(state.currentCustomer.customer_id);
    } catch (error) {
        ui.showMessage(error.message, "error");
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Abre a janela do recibo e usa uma verificação ativa para garantir que ela esteja pronta.
 */
function handlePrintReceipt() {
    if (!state.currentOrder || !state.currentCustomer || !state.currentBalance || state.currentOrder.isNew) {
        return ui.showMessage('Selecione um pedido salvo para imprimir.', 'error');
    }

    const receiptWindow = window.open('receipt.html', 'Recibo', 'width=320,height=600,scrollbars=yes');

    if (!receiptWindow) {
        alert('Seu navegador bloqueou a janela de impressão. Por favor, habilite os pop-ups para este site.');
        return;
    }

    const maxTries = 20;
    let tries = 0;
    const interval = setInterval(() => {
        if (receiptWindow.closed) {
            clearInterval(interval);
            return;
        }
        tries++;
        if (typeof receiptWindow.printReceipt === 'function') {
            clearInterval(interval);
            receiptWindow.printReceipt(state.currentOrder, state.currentCustomer, state.currentBalance);
        } else if (tries > maxTries) {
            clearInterval(interval);
            alert('Não foi possível se comunicar com a janela de impressão. Por favor, tente novamente.');
        }
    }, 100);
}

/**
 * NOVA FUNÇÃO
 * Lida com o clique no botão "Editar Datas".
 */
function handleEditDatesClick() {
    if (state.currentOrder) {
        console.log("Calling RenderDatesModal")
        ui.renderDatesModal(state.currentOrder);
    }
}

/**
 * NOVA FUNÇÃO
 * Salva as datas do modal de volta para o objeto 'state'.
 */
function handleSaveDates(event) {
    event.preventDefault(); // Impede o envio do formulário
    if (!state.currentOrder) return;

    const modal = document.getElementById('edit-dates-modal');
    // Atualiza o 'state' com os novos valores dos inputs do modal
    state.currentOrder.created_at = modal.querySelector('#modal-created-at').value;
    state.currentOrder.completed_at = modal.querySelector('#modal-completed-at').value;
    state.currentOrder.paid_at = modal.querySelector('#modal-paid-at').value;

    ui.showMessage("Datas atualizadas na memória. Salve o pedido para persistir.", "info");
    ui.toggleModal('edit-dates-modal', false);
}

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
                    // Esconde as sugestões após a seleção
                    ui.clearOrderSuggestions(); 
                });
            } catch (error) { ui.showMessage(error.message, 'error'); }
        }, 300);
    });
    orderSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Garante que as sugestões sejam limpas ao pressionar Enter
            ui.clearOrderSuggestions(); 
            loadOrder(orderSearchInput.value.trim().toUpperCase());
        }
    });

    // Listener global para fechar as sugestões ao clicar fora
    window.addEventListener('click', (e) => {
    // CORRIGIDO: Usa a classe '.client-actions' para encontrar o contêiner
    const customerSearchContainer = document.querySelector('.client-actions .search-container');
    if (customerSearchContainer && !customerSearchContainer.contains(e.target)) {
    ui.clearCustomerSuggestions();
    }
    const orderSearchContainer = document.querySelector('.order-info .search-container');
    if (orderSearchContainer && !orderSearchContainer.contains(e.target)) {
    ui.clearOrderSuggestions();
    }
    });
    
    document.getElementById('product-search-input').addEventListener('input', handleProductSearch);

    // ... (resto dos listeners para botões e modais, sem alterações) ...
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
    
    document.getElementById('add-package-btn').addEventListener('click', () => {
        if (!state.currentCustomer) return;
        document.getElementById('add-package-form').reset();
        ui.toggleModal('add-package-modal', true);
    });
    
   document.getElementById('manage-prices-btn').addEventListener('click', handleManagePricesClick);
    document.getElementById('new-customer-form').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('add-package-form').addEventListener('submit', handleAddPackageSubmit);
    document.getElementById('save-prices-btn').addEventListener('click', handleSavePrices);
    document.getElementById('new-customer-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('new-customer-modal', false));
    document.getElementById('customer-orders-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('customer-orders-modal', false));
    document.getElementById('add-package-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('add-package-modal', false));
    document.getElementById('price-management-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('price-management-modal', false));
    
    document.getElementById('execution-status-options').addEventListener('click', (e) => { if (e.target.classList.contains('option-button')) handleStatusChange('execution', e.target.dataset.status); });
    document.getElementById('payment-methods').addEventListener('click', (e) => { if (e.target.classList.contains('option-button') && !e.target.disabled) { handleAddPayment(e.target.dataset.method); } });
    document.getElementById('staged-payments-list').addEventListener('click', (e) => { if (e.target.classList.contains('remove-payment-btn')) { handleRemoveStagedPayment(e.target.dataset.paymentId); } });
    
    document.getElementById('pickup-datetime-input').addEventListener('input', (e) => { if (state.currentOrder) state.currentOrder.pickup_datetime = e.target.value; });
 
    // Listener para o novo botão "Editar Datas"
    document.getElementById('edit-dates-btn').addEventListener('click', handleEditDatesClick);

    // Listener para o formulário do novo modal de datas
   document.getElementById('edit-dates-form').addEventListener('submit', handleSaveDates);
    document.getElementById('edit-dates-modal').querySelector('.close-button').addEventListener('click', () => ui.toggleModal('edit-dates-modal', false));


    // Carregamento inicial de dados
    ui.showLoading(true);
    try {
        const initialData = await api.getInitialData();
        state.allProducts = initialData.products;
        state.products = [...state.allProducts];
        state.categories = initialData.categories;
        ui.renderCategories(state.categories, (category) => {
            document.getElementById('product-search-input').value = '';
            const sourceList = state.currentCustomer ? state.products : state.allProducts;
            if (category === 'TODAS') {
                ui.renderProducts(state.products, handleAddProductToOrder);
            } else {
                const filtered = state.products.filter(p => p.category === category);
                ui.renderProducts(filtered, handleAddProductToOrder);
            }
        });
        ui.renderProducts(state.products, handleAddProductToOrder);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
    
    resetApplication();
}

document.addEventListener('DOMContentLoaded', init);