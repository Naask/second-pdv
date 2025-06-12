// public/js/api.js
// Módulo responsável por toda a comunicação com a API do backend.

const BASE_URL = '/api/v1';

/**
 * Função auxiliar genérica para realizar chamadas fetch e tratar respostas.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: '/products/initial-data').
 * @param {object} options - As opções da requisição fetch (method, headers, body).
 * @returns {Promise<any>} O JSON retornado pela API.
 * @throws {Error} Lança um erro com a mensagem do servidor se a resposta não for 'ok'.
 */
async function fetchJSON(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || `Erro ${response.status}: ${response.statusText}`;
            throw new Error(message);
        }

        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error(`Erro na chamada API para ${endpoint}:`, error);
        throw error;
    }
}


// --- Funções da API ---

export const getInitialData = () => fetchJSON('/products/initial-data');

// --- Clientes ---
export const searchCustomers = (name) => fetchJSON(`/customers/search?name=${encodeURIComponent(name)}`);
export const getCustomerDetails = (customerId) => fetchJSON(`/customers/${customerId}/details`);
export const createCustomer = (customerData) => fetchJSON('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
});

// --- Pedidos ---
export const createOrder = (customerId) => fetchJSON('/orders', {
    method: 'POST',
    body: JSON.stringify({ customerId }),
});

// --- FUNÇÃO QUE FALTAVA ---
/**
 * Busca os detalhes completos de um pedido específico.
 */
export const getOrderDetails = (orderId) => fetchJSON(`/orders/${orderId}`);
// -------------------------

export const searchOrders = (partialId) => fetchJSON(`/orders/search?id=${encodeURIComponent(partialId)}`);

export const addItemToOrder = (orderId, itemData) => fetchJSON(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(itemData),
});

export const removeItemFromOrder = (orderId, orderItemId) => fetchJSON(`/orders/${orderId}/items/${orderItemId}`, {
    method: 'DELETE',
});

export const updateOrderStatus = (orderId, status) => fetchJSON(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
});

export const processPaymentWithBalance = (orderId) => fetchJSON(`/orders/${orderId}/payment`, {
    method: 'POST',
});