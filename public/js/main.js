// public/js/main.js
import * as api from './api.js';
import * as ui from './ui.js';

// --- Estado da Aplicação ---
let currentCustomerId = null;
let debounceTimer;

// --- Manipuladores de Eventos (Handlers) ---

/**
 * Lida com a busca de clientes enquanto o usuário digita.
 * Utiliza debouncing para evitar chamadas excessivas à API.
 * @param {Event} event - O evento de input.
 */
async function handleCustomerSearch(event) {
    clearTimeout(debounceTimer);
    const searchTerm = event.target.value;

    if (searchTerm.length < 2) {
        ui.clearSuggestions();
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            const customers = await api.searchCustomers(searchTerm);
            ui.renderCustomerSuggestions(customers, handleSelectCustomer);
        } catch (error) {
            ui.showMessage(error.message, 'error');
        }
    }, 300); // Aguarda 300ms após o usuário parar de digitar
}

/**
 * Lida com a seleção de um cliente a partir das sugestões.
 * @param {string} customerId - O ID do cliente selecionado.
 */
async function handleSelectCustomer(customerId) {
    currentCustomerId = customerId;
    ui.clearSuggestions();
    ui.showLoading(true);
    try {
        const customerData = await api.getCustomerDetails(customerId);
        ui.renderCustomerDetails(customerData);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com o envio do formulário de novo cliente.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleNewCustomerSubmit(event) {
    event.preventDefault(); // Impede o recarregamento da página
    const customerData = ui.getNewCustomerFormData();
    
    if (!customerData.name) {
        ui.showMessage('O nome do cliente é obrigatório.', 'error');
        return;
    }

    ui.showLoading(true);
    try {
        const newCustomer = await api.createCustomer(customerData);
        ui.showMessage(`Cliente "${newCustomer.name}" criado com sucesso!`, 'success');
        ui.toggleModal(document.getElementById('new-customer-modal'), false);
        ui.clearForm(event.target);
        // Seleciona o cliente recém-criado
        handleSelectCustomer(newCustomer.customer_id);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Lida com o envio do formulário de adição de pacote pré-pago.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleAddPackageSubmit(event) {
    event.preventDefault();
    const packageData = ui.getAddPackageFormData();

    if (!packageData.paidAmount || packageData.bonusAmount === null) {
        ui.showMessage('Ambos os campos são obrigatórios.', 'error');
        return;
    }
    
    ui.showLoading(true);
    try {
        await api.addPrepaidPackage(currentCustomerId, packageData);
        ui.showMessage('Pacote adicionado com sucesso!', 'success');
        ui.toggleModal(document.getElementById('add-package-modal'), false);
        ui.clearForm(event.target);
        // Atualiza os dados na tela para refletir o novo saldo
        handleSelectCustomer(currentCustomerId);
    } catch (error) {
        ui.showMessage(error.message, 'error');
    } finally {
        ui.showLoading(false);
    }
}


/**
 * Inicializa todos os event listeners da aplicação.
 */
function initializeEventListeners() {
    // --- Elementos de busca e visualização ---
    document.getElementById('customer-search-input').addEventListener('input', handleCustomerSearch);
    document.getElementById('close-customer-view-btn').addEventListener('click', ui.showSearchView);
    
    // --- Modais ---
    const newCustomerModal = document.getElementById('new-customer-modal');
    const addPackageModal = document.getElementById('add-package-modal');

    // Botões para abrir modais
    document.getElementById('new-customer-btn').addEventListener('click', () => ui.toggleModal(newCustomerModal, true));
    document.getElementById('add-package-btn').addEventListener('click', () => ui.toggleModal(addPackageModal, true));

    // Botões para fechar modais
    newCustomerModal.querySelector('.close-button').addEventListener('click', () => ui.toggleModal(newCustomerModal, false));
    addPackageModal.querySelector('.close-button').addEventListener('click', () => ui.toggleModal(addPackageModal, false));
    
    // Fechar modal ao clicar fora do conteúdo
    window.addEventListener('click', (event) => {
        if (event.target === newCustomerModal) ui.toggleModal(newCustomerModal, false);
        if (event.target === addPackageModal) ui.toggleModal(addPackageModal, false);
    });

    // --- Formulários ---
    document.getElementById('new-customer-form').addEventListener('submit', handleNewCustomerSubmit);
    document.getElementById('add-package-form').addEventListener('submit', handleAddPackageSubmit);
}

// --- Ponto de Entrada da Aplicação ---
// Garante que o DOM está totalmente carregado antes de executar o script.
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    console.log('Aplicação PDV Lavanderia inicializada.');
});