// public/js/receipt.js

// Funções auxiliares
const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';

/**
 * Função principal que é executada quando a página do recibo carrega.
 */
async function initializeReceipt() {
    // Pega o ID do pedido da URL da página
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
        document.body.innerHTML = 'Erro: ID do pedido não encontrado na URL.';
        return;
    }

    try {
        // Busca os dados do pedido na API
        const order = await fetch(`/api/v1/orders/${orderId}`).then(res => res.json());
        if (order.message) throw new Error(order.message);

        // Busca os dados do cliente na API
        const customerInfo = await fetch(`/api/v1/customers/${order.customer_id}/details`).then(res => res.json());
        if (customerInfo.message) throw new Error(customerInfo.message);
        
        const customer = customerInfo.details;
        const balance = customerInfo.balance;

        // Preenche todos os dados do recibo
        document.getElementById('receipt-order-id').textContent = order.order_id;
        document.getElementById('receipt-entry-date').textContent = formatDate(order.created_at);
        document.getElementById('receipt-pickup-date').textContent = formatDate(order.pickup_datetime);
        document.getElementById('receipt-customer-name').textContent = customer.name;
        document.getElementById('receipt-customer-phone').textContent = customer.phone || 'N/A';
        const itemsTbody = document.getElementById('receipt-items-tbody');
        itemsTbody.innerHTML = '';
        order.items.forEach(item => {
            const row = itemsTbody.insertRow();
            const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
            row.innerHTML = `<td>${item.product_name}</td><td>${item.quantity}</td><td>${formatCurrency(item.unit_price)}</td><td>${formatCurrency(itemTotal)}</td>`;
        });
        document.getElementById('receipt-total').textContent = formatCurrency(order.total_amount);
        const paymentStatusText = order.payment_status === 'PAGO' ? 'PAGO' : 'Pagar na Retirada';
        document.getElementById('receipt-payment-status').textContent = paymentStatusText;
        document.getElementById('receipt-customer-balance').textContent = formatCurrency(balance.totalBalance);

        // Define o 'src' da imagem para o nosso novo endpoint de código de barras
        const barcodeImg = document.getElementById('barcode-img');
        barcodeImg.src = `/api/v1/orders/barcode/${order.order_id}`;

        // Espera a imagem carregar e só então chama a impressão
        barcodeImg.onload = () => {
            setTimeout(() => {
                window.print();
                window.close();
            }, 100); // Pequeno delay para garantir a renderização
        };
        barcodeImg.onerror = () => {
            console.error("Erro ao carregar a imagem do código de barras.");
        }

    } catch (error) {
        console.error("Erro ao inicializar o recibo:", error);
        document.body.innerHTML = `Erro ao carregar dados: ${error.message}`;
    }
}

// Inicia o processo assim que a página do recibo carregar
window.addEventListener('DOMContentLoaded', initializeReceipt);