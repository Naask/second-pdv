// Este script é executado na janela de pop-up do recibo (receipt.html)

const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';

/**
 * FUNÇÃO SUBSTITUÍDA
 * Preenche todos os dados do recibo e gera o código de barras.
 */
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
    
    const paymentStatusText = order.payment_status === 'PAGO' ? 'PAGO' : 'Pagar na Retirada';
    document.getElementById('receipt-payment-status').textContent = paymentStatusText;
    document.getElementById('receipt-customer-balance').textContent = formatCurrency(balance.totalBalance);

// --- LÓGICA DE GERAÇÃO DO CÓDIGO DE BARRAS CORRIGIDA ---

    // Verifica se temos um ID de pedido válido e a função JsBarcode existe
    if (order.order_id && typeof JsBarcode === 'function') {
        // Para depuração: Verifique o console da janela de impressão (Ctrl+Shift+I)
        console.log("Gerando código de barras para o pedido:", order.order_id);

        try {
            JsBarcode("#barcode", order.order_id, {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 14,
                margin: 0
            });
        } catch (e) {
            // Se houver um erro na geração, ele será exibido no console
            console.error("Erro ao gerar o código de barras:", e);
            document.querySelector(".barcode-container").innerHTML = "Erro ao gerar código de barras.";
        }
    } else {
        console.log("Não foi possível gerar o código de barras. ID do pedido ou biblioteca JsBarcode ausente.");
    }
    
    // Dispara a impressão
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