// database/migrate_upload.js
const fs = require('fs');
const path = require('path');
const { saveOrder } = require('../src/services/orderService');

console.log('--- Script 2 (v2): Upload para o Banco de Dados ---');

/**
 * 2. GERAÇÃO DE ID DO PEDIDO
 * Esta função é uma cópia do método padrão do seu sistema de PDV (encontrado em public/js/main.js)
 * para garantir que os IDs de pedidos migrados sigam o mesmo padrão.
 */
function generateShortId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return id;
}

function uploadProcessedData() {
    try {
        const filePath = path.resolve(__dirname, 'migracao_pronta.json');
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo 'migracao_pronta.json' não encontrado. Execute o script 'migrate:read' primeiro.`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const ordersToUpload = JSON.parse(fileContent);

        if (ordersToUpload.length === 0) {
            console.warn('Nenhum pedido encontrado no arquivo para fazer o upload.');
            return;
        }

        console.log(`Encontrados ${ordersToUpload.length} pedidos para importar para o banco de dados...`);
        let successCount = 0;
        let errorCount = 0;

        for (const order of ordersToUpload) {
            // Atribui o novo ID gerado ao pedido antes de salvar
            order.order_id = generateShortId();
            
            try {
                saveOrder(order);
                console.log(`[OK] Pedido antigo #${order.id_antigo} salvo com o novo ID #${order.order_id}.`);
                successCount++;
            } catch (error) {
                console.error(`[ERRO] Falha ao salvar o pedido antigo #${order.id_antigo}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n--- Upload Concluído ---');
        console.log(`[SUCESSO] ${successCount} pedidos foram importados para o banco de dados.`);
        console.log(`[FALHAS] ${errorCount} pedidos falharam durante o salvamento.`);

    } catch (error) {
        console.error('\n[ERRO FATAL] A operação de upload foi interrompida:', error.message);
    }
}

uploadProcessedData();