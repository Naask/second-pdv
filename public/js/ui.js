// public/js/ui.js

// --- Cache de Elementos do DOM ---
// Buscamos todos os elementos que vamos manipular uma única vez para melhor performance.
const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    messageContainer: document.getElementById('message-container'),
    customerSearchSection: document.getElementById('customer-search-section'),
    customerDetailsSection: document.getElementById('customer-details-section'),
    customerSearchInput: document.getElementById('customer-search-input'),
    customerSuggestions: document.getElementById('customer-suggestions'),
    customerNameDisplay: document.getElementById('customer-name-display'),
    customerPhoneDisplay: document.getElementById('customer-phone-display'),
    customerEmailDisplay: document.getElementById('customer-email-display'),
    balanceTotal: document.getElementById('balance-total'),
    balanceMain: document.getElementById('balance-main'),
    balanceBonus: document.getElementById('balance-bonus'),
    ledgerTableBody: document.getElementById('ledger-table-body'),
    newCustomerModal: document.getElementById('new-customer-modal'),
    addPackageModal: document.getElementById('add-package-modal'),
    newCustomerForm: document.getElementById('new-customer-form'),
    addPackageForm: document.getElementById('add-package-form'),
};

/**
 * Mostra ou esconde o overlay de carregamento.
 * @param {boolean} isLoading - True para mostrar, false para esconder.
 */
export function showLoading(isLoading) {
    elements.loadingOverlay.classList.toggle('hidden', !isLoading);
}

/**
 * Exibe uma mensagem de feedback para o usuário.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success' | 'error'} type - O tipo da mensagem.
 */
export function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    elements.messageContainer.appendChild(messageDiv);

    // Remove a mensagem após 4 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

/**
 * Formata um valor inteiro em centavos para uma string de moeda BRL.
 * @param {number} amountInCents - Ex: 2550
 * @returns {string} - Ex: "25,50"
 */
function formatCurrency(amountInCents) {
    return (amountInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Renderiza as sugestões de clientes abaixo da barra de busca.
 * @param {Array<object>} customers - A lista de clientes retornada pela API.
 * @param {function} onSelect - A função a ser chamada quando um cliente é selecionado.
 */
export function renderCustomerSuggestions(customers, onSelect) {
    clearSuggestions();
    customers.forEach(customer => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.textContent = `${customer.name} - ${customer.phone || 'Sem telefone'}`;
        suggestionDiv.dataset.customerId = customer.customer_id;
        suggestionDiv.addEventListener('click', () => onSelect(customer.customer_id));
        elements.customerSuggestions.appendChild(suggestionDiv);
    });
}

export function clearSuggestions() {
    elements.customerSuggestions.innerHTML = '';
}

/**
 * Preenche a seção de detalhes do cliente com os dados, saldo e extrato.
 * @param {object} data - O objeto completo retornado por `getCustomerDetails`.
 */
export function renderCustomerDetails(data) {
    const { details, balance, ledger } = data;
    elements.customerNameDisplay.textContent = details.name;
    elements.customerPhoneDisplay.textContent = details.phone || '-';
    elements.customerEmailDisplay.textContent = details.email || '-';

    elements.balanceTotal.textContent = formatCurrency(balance.totalBalance);
    elements.balanceMain.textContent = formatCurrency(balance.mainBalance);
    elements.balanceBonus.textContent = formatCurrency(balance.bonusBalance);

    renderLedger(ledger);
    showCustomerDetailsView();
}

/**
 * Renderiza as transações do ledger na tabela.
 * @param {Array<object>} ledger - A lista de transações.
 */
function renderLedger(ledger) {
    elements.ledgerTableBody.innerHTML = ''; // Limpa a tabela antes de preencher
    if (ledger.length === 0) {
        elements.ledgerTableBody.innerHTML = '<tr><td colspan="4">Nenhuma transação encontrada.</td></tr>';
        return;
    }

    ledger.forEach(t => {
        const row = document.createElement('tr');
        const transactionDate = new Date(t.timestamp).toLocaleString('pt-BR');
        
        let typeClass = 'transaction-type-neutral';
        if (['PAYMENT_RECEIVED', 'BONUS_ADDED', 'BALANCE_CORRECTION_CREDIT'].includes(t.transaction_type)) {
            typeClass = 'transaction-type-credit';
        } else if (['SALE', 'BALANCE_CORRECTION_DEBIT'].includes(t.transaction_type)) {
            typeClass = 'transaction-type-debit';
        }

        row.innerHTML = `
            <td>${transactionDate}</td>
            <td class="${typeClass}">${t.transaction_type.replace(/_/g, ' ')}</td>
            <td>${t.description}</td>
            <td class="amount ${typeClass}">${formatCurrency(t.amount)}</td>
        `;
        elements.ledgerTableBody.appendChild(row);
    });
}

/** Alterna a visibilidade entre a busca e a visão de detalhes do cliente. */
function showCustomerDetailsView() {
    elements.customerSearchSection.classList.add('hidden');
    elements.customerDetailsSection.classList.remove('hidden');
}

export function showSearchView() {
    elements.customerDetailsSection.classList.add('hidden');
    elements.customerSearchSection.classList.remove('hidden');
    elements.customerSearchInput.value = '';
    elements.customerSearchInput.focus();
}

/**
 * Controla a visibilidade de um modal.
 * @param {HTMLElement} modalElement - O elemento do modal a ser controlado.
 * @param {boolean} show - True para mostrar, false para esconder.
 */
export function toggleModal(modalElement, show) {
    if (show) {
        modalElement.classList.remove('hidden');
    } else {
        modalElement.classList.add('hidden');
    }
}

/** Funções para obter dados de formulários e limpar. */
export function getNewCustomerFormData() {
    return {
        name: document.getElementById('new-name').value,
        phone: document.getElementById('new-phone').value,
        email: document.getElementById('new-email').value,
        address: document.getElementById('new-address').value,
    };
}

export function getAddPackageFormData() {
    return {
        paidAmount: parseInt(document.getElementById('package-paid-amount').value, 10),
        bonusAmount: parseInt(document.getElementById('package-bonus-amount').value, 10),
    };
}

export function clearForm(formElement) {
    formElement.reset();
}