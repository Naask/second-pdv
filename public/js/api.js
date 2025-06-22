// public/js/api.js
const BASE_URL = '/api/v1';

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
        // Retorna null para status 204 (No Content) ou o JSON da resposta
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error(`Erro na chamada API para ${endpoint}:`, error);
        throw error;
    }
}

// --- Funções da API ---

export const getInitialData = () => fetchJSON('/products/initial-data');
export const searchCustomers = (name) => fetchJSON(`/customers/search?name=${encodeURIComponent(name)}`);
export const getCustomerDetails = (customerId) => fetchJSON(`/customers/${customerId}/details`);
export const createCustomer = (customerData) => fetchJSON('/customers', { method: 'POST', body: JSON.stringify(customerData) });
export const updateCustomer = (customerId, customerData) => fetchJSON(`/customers/${customerId}`, { method: 'PATCH', body: JSON.stringify(customerData) });
export const addPrepaidPackage = (customerId, data) => fetchJSON(`/customers/${customerId}/packages`, { method: 'POST', body: JSON.stringify(data) });

// CORRIGIDO: A URL para buscar pedidos de um cliente foi padronizada
export const getOrdersByCustomer = (customerId) => fetchJSON(`/customers/${customerId}/orders`);

export const getProductsForCustomer = (customerId) => fetchJSON(`/customers/${customerId}/products`);
export const saveCustomerPrices = (customerId, prices) => fetchJSON(`/customers/${customerId}/prices`, { method: 'POST', body: JSON.stringify({ prices }) });

// --- Funções de Pedido ---
export const getOrderDetails = (orderId) => fetchJSON(`/orders/${orderId}`);
export const searchOrders = (partialId) => fetchJSON(`/orders/search?id=${encodeURIComponent(partialId)}`);
export const saveOrder = (orderData) => fetchJSON('/orders/save', { method: 'POST', body: JSON.stringify(orderData) });

// --- Função de Barcode ---
// A chamada para o barcode não precisa de fetchJSON, pois é uma imagem
export const getBarcodeUrl = (text) => `${BASE_URL}/orders/barcode/${encodeURIComponent(text)}`;