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

        // Retorna null para respostas sem conteúdo (ex: DELETE bem-sucedido)
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error(`Erro na chamada API para ${endpoint}:`, error);
        // Re-lança o erro para que a camada de UI possa tratá-lo.
        throw error;
    }
}


// --- Funções da API ---

/**
 * Busca os dados iniciais para o PDV (todos os produtos e todas as categorias).
 */
export const getInitialData = () => fetchJSON('/products/initial-data');

/**
 * Busca clientes por nome.
 */
export const searchCustomers = (name) => fetchJSON(`/customers/search?name=${encodeURIComponent(name)}`);

/**
 * Busca os detalhes completos de um cliente (dados e saldo).
 */
export const getCustomerDetails = (customerId) => fetchJSON(`/customers/${customerId}/details`);

/**
 * Cria um novo cliente.
 */
export const createCustomer = (customerData) => fetchJSON('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
});

/**
 * Cria um novo pedido para um cliente.
 */
export const createOrder = (customerId) => fetchJSON('/orders', {
    method: 'POST',
    body: JSON.stringify({ customerId }),
});

/**
 * Adiciona um item a um pedido existente.
 */
export const addItemToOrder = (orderId, itemData) => fetchJSON(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(itemData), // Ex: { productId: 1, quantity: 2.5 }
});

/**
 * Remove um item de um pedido.
 */
export const removeItemFromOrder = (orderId, orderItemId) => fetchJSON(`/orders/${orderId}/items/${orderItemId}`, {
    method: 'DELETE',
});

/**
 * Atualiza o status de um pedido.
 */
export const updateOrderStatus = (orderId, status) => fetchJSON(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
});

/**
 * Processa o pagamento de um pedido com o saldo do cliente.
 */
export const processPaymentWithBalance = (orderId) => fetchJSON(`/orders/${orderId}/payment`, {
    method: 'POST',
});