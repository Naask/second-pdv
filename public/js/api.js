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
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error(`Erro na chamada API para ${endpoint}:`, error);
        throw error;
    }
}

export const getInitialData = () => fetchJSON('/products/initial-data');
export const searchCustomers = (name) => fetchJSON(`/customers/search?name=${encodeURIComponent(name)}`);
export const getCustomerDetails = (customerId) => fetchJSON(`/customers/${customerId}/details`);
export const createCustomer = (customerData) => fetchJSON('/customers', { method: 'POST', body: JSON.stringify(customerData) });
export const updateCustomer = (customerId, customerData) => fetchJSON(`/customers/${customerId}`, { method: 'PATCH', body: JSON.stringify(customerData) });
export const getOrderDetails = (orderId) => fetchJSON(`/orders/${orderId}`);
export const searchOrders = (partialId) => fetchJSON(`/orders/search?id=${encodeURIComponent(partialId)}`);
export const getOrdersByCustomer = (customerId) => fetchJSON(`/customers/${customerId}/orders`);
export const saveOrder = (orderData) => fetchJSON('/orders/save', { method: 'POST', body: JSON.stringify(orderData) });
export const addCredit = (customerId, data) => fetchJSON(`/customers/${customerId}/credits`, { method: 'POST', body: JSON.stringify(data) });
export const addPrepaidPackage = (customerId, data) => fetchJSON(`/customers/${customerId}/packages`, { method: 'POST', body: JSON.stringify(data) });
export const processPayment = (orderId, paymentData) => fetchJSON(`/orders/${orderId}/pay`, { method: 'POST', body: JSON.stringify(paymentData) });