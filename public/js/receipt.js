// Este script é executado na janela de pop-up do recibo (receipt.html)

const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';

function printReceipt(order, customer, balance) {
    if (!order || !customer || !balance) {
        document.body.innerHTML = 'Erro: Dados do pedido incompletos.';
        return;
    }
    
    // Preenche os detalhes do pedido e cliente
    document.getElementById('receipt-order-id').textContent = order.order_id;
    document.getElementById('receipt-entry-date').textContent = formatDate(order.created_at);
    document.getElementById('receipt-pickup-date').textContent = formatDate(order.pickup_datetime);
    document.getElementById('receipt-customer-name').textContent = customer.name;
    document.getElementById('receipt-customer-phone').textContent = customer.phone || 'N/A';

    const itemsTbody = document.getElementById('receipt-items-tbody');
    itemsTbody.innerHTML = ''; 

    // Adiciona cada item do pedido à tabela do recibo
    order.items.forEach(item => {
        const row = itemsTbody.insertRow();
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        
        row.innerHTML = `
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(itemTotal)}</td>
        `;
    });

    // Preenche o rodapé
    document.getElementById('receipt-total').textContent = formatCurrency(order.total_amount);
    
    // Lógica para o status de pagamento
    const paymentStatusText = order.payment_status === 'PAGO' ? 'PAGO' : 'Pagar na Retirada';
    document.getElementById('receipt-payment-status').textContent = paymentStatusText;
    document.getElementById('receipt-customer-balance').textContent = formatCurrency(balance.totalBalance);

    setTimeout(() => {
        window.print();
        window.close();
    }, 250);
}

// Ouve o evento da janela principal que envia os dados
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    
    const { order, customer, balance } = event.data;
    printReceipt(order, customer, balance);
}, false);