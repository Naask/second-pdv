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
 * FUNÇÃO SIMPLIFICADA
 * Apenas abre a janela do recibo, passando o ID do pedido como parâmetro na URL.
 */
function handlePrintReceipt() {
    if (!state.currentOrder || state.currentOrder.isNew) {
        return ui.showMessage('Selecione um pedido salvo para imprimir.', 'error');
    }

    // Abre a janela passando o ID do pedido na URL
    const url = `receipt.html?orderId=${state.currentOrder.order_id}`;
    window.open(url, 'Recibo', 'width=320,height=600,scrollbars=yes');
}

/**
 * NOVA FUNÇÃO
 * Lida com a impressão direta (RAW) para uma impressora térmica via WebUSB.
 */
async function handleDirectPrint() {
    if (!state.currentOrder || !state.currentCustomer || state.currentOrder.isNew) {
        return ui.showMessage('Selecione um pedido salvo para imprimir.', 'error');
    }

    // Comandos ESC/POS para formatação
    const ESC = '\x1B';
    const GS = '\x1D';
    const CENTER = ESC + 'a' + '\x01';
    const LEFT = ESC + 'a' + '\x00';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const CUT_PAPER = GS + 'V' + '\x01';
    const INITIALIZE = ESC + '@';

    // Monta o texto do recibo
    let receiptText = INITIALIZE;
    receiptText += CENTER;
    receiptText += BOLD_ON + 'Brilho & Cia Lavanderia\n' + BOLD_OFF;
    receiptText += 'R. Bento de Arruda Camargo, 900\n';
    receiptText += 'Telefone: (19) 99941-8333\n\n';
    receiptText += 'Horario de funcionamento:\n';
    receiptText += 'Seg a Sex 08:00-17:00, Sab 09:00-12:00\n';
    receiptText += '------------------------------------------\n';
    receiptText += LEFT;
    receiptText += `Pedido: ${state.currentOrder.order_id}\n`;
    receiptText += `Data de Entrada: ${new Date(state.currentOrder.created_at).toLocaleString('pt-BR')}\n`;
    receiptText += BOLD_ON + `Retirar a partir de: ${state.currentOrder.pickup_datetime ? new Date(state.currentOrder.pickup_datetime).toLocaleString('pt-BR') : 'N/A'}\n\n` + BOLD_OFF;
    receiptText += BOLD_ON + `Cliente: ${state.currentCustomer.name}\n` + BOLD_OFF;
    receiptText += `Telefone: ${state.currentCustomer.phone || 'N/A'}\n`;
    receiptText += '------------------------------------------\n';
    receiptText += 'Item                Qtd   V.Un.   Total\n';
    
    state.currentOrder.items.forEach(item => {
        const name = item.product_name.padEnd(20, ' ').substring(0, 20);
        const qty = item.quantity.toString().padEnd(5, ' ');
        const price = (item.unit_price/100).toFixed(2).toString().padStart(7, ' ');
        const total = ((item.unit_price * item.quantity)/100).toFixed(2).toString().padStart(7, ' ');
        receiptText += `${name}${qty}${price}${total}\n`;
    });
    
    receiptText += '------------------------------------------\n';
    const totalAmount = (state.currentOrder.total_amount / 100).toFixed(2).padStart(38, ' ');
    receiptText += `TOTAL: ${totalAmount}\n\n`;
    
    const paymentStatusText = state.currentOrder.payment_status === 'PAGO' ? 'PAGO' : 'Pagar na Retirada';
    receiptText += `Status Pagamento: ${paymentStatusText}\n`;

    try {
        ui.showLoading(true);
        // Solicita ao usuário para selecionar a impressora USB
        const device = await navigator.usb.requestDevice({ filters: [{ vendorId: 0x04b8 }] }); // 0x04b8 é o vendorId da Epson
        await device.open();
        await device.selectConfiguration(1);
        
        // Encontra a interface de impressão correta
        const anInterface = device.configuration.interfaces.find(iface => iface.alternates[0].interfaceClass === 7);
        const endpoint = anInterface.alternates[0].endpoints.find(ep => ep.direction === 'out');
        
        await device.claimInterface(anInterface.interfaceNumber);

        const encoder = new TextEncoder();

        // Envia o texto formatado
        await device.transferOut(endpoint.endpointNumber, encoder.encode(receiptText));
        
        // Comandos para imprimir o código de barras
        const orderIdBytes = encoder.encode(state.currentOrder.order_id);
        const barcodeCommands = new Uint8Array([
            0x1d, 0x68, 60,       // GS h 60  -> Altura do código de barras
            0x1d, 0x77, 2,        // GS w 2   -> Largura da barra
            0x1d, 0x6b, 73,       // GS k 73  -> Tipo de código (CODE128)
            orderIdBytes.length,  // Comprimento do dado
            ...orderIdBytes,
            0x0a,                 // New line
            0x1d, 0x56, 1         // GS V 1   -> Cortar papel
        ]);
        
        // Envia os comandos do código de barras
        await device.transferOut(endpoint.endpointNumber, barcodeCommands);

        await device.close();
        ui.showMessage('Impressão enviada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro na impressão direta:', error);
        ui.showMessage(`Erro ao imprimir: ${error.message}`, 'error');
    } finally {
        ui.showLoading(false);
    }
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
    
    // Adiciona listeners para o botão de pacote

    document.getElementById('add-package-btn').addEventListener('click', () => {
        if (!state.currentCustomer) return;
        document.getElementById('add-package-form').reset();
        ui.toggleModal('add-package-modal', true);
    });

    // Listeners para submissão de formulários
    document.getElementById('new-customer-form').addEventListener('submit', handleCustomerSubmit);
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