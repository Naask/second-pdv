// public/js/api.js

const BASE_URL = '/api/v1';

/**
 * Uma função auxiliar para realizar chamadas fetch e tratar as respostas.
 * @param {string} url - A URL para a qual a requisição será feita.
 * @param {object} options - As opções da requisição fetch (método, headers, corpo).
 * @returns {Promise<any>} - O JSON retornado pela API.
 * @throws {Error} - Lança um erro se a resposta da rede não for 'ok'.
 */
async function fetchJSON(url, options = {}) {
    // Define o header padrão para todas as requisições
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    // Se a resposta não for bem-sucedida, tenta extrair a mensagem de erro do corpo
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const errorMessage = errorData.details || errorData.message || 'Ocorreu um erro na comunicação com o servidor.';
        throw new Error(errorMessage);
    }

    // Se a resposta for 204 No Content, retorna null pois não há corpo
    if (response.status === 204) {
        return null;
    }
    
    return response.json();
}

/**
 * Busca clientes pelo nome.
 * @param {string} name - O nome (ou parte do nome) a ser buscado.
 * @returns {Promise<Array>} - Uma lista de clientes correspondentes.
 */
export function searchCustomers(name) {
    return fetchJSON(`${BASE_URL}/customers/search?name=${encodeURIComponent(name)}`);
}

/**
 * Obtém os detalhes completos de um cliente.
 * @param {string} customerId - O ID do cliente.
 * @returns {Promise<object>} - Os detalhes do cliente, saldo e extrato.
 */
export function getCustomerDetails(customerId) {
    return fetchJSON(`${BASE_URL}/customers/${customerId}/details`);
}

/**
 * Cria um novo cliente.
 * @param {object} customerData - Os dados do novo cliente { name, phone, email, address }.
 * @returns {Promise<object>} - O objeto do cliente recém-criado.
 */
export function createCustomer(customerData) {
    return fetchJSON(`${BASE_URL}/customers`, {
        method: 'POST',
        body: JSON.stringify(customerData),
    });
}

/**
 * Adiciona um pacote pré-pago a um cliente.
 * @param {string} customerId - O ID do cliente.
 * @param {object} packageData - Os dados do pacote { paidAmount, bonusAmount }.
 * @returns {Promise<object>} - A resposta de sucesso da API.
 */
export function addPrepaidPackage(customerId, packageData) {
    return fetchJSON(`${BASE_URL}/customers/${customerId}/packages`, {
        method: 'POST',
        body: JSON.stringify(packageData),
    });
}