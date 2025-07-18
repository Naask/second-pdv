// database/migrate_read.js
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('./database.js');

console.log('--- Script 1 (v6): Leitura e Estruturação de Dados (com horário padrão 09:00) ---');

function createMappingFromXLSX(workbook, sheetName, keyColumn, valueColumn) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error(`Aba '${sheetName}' não encontrada.`);
    const records = xlsx.utils.sheet_to_json(worksheet);
    
    const map = new Map();
    for (const record of records) {
        const key = record[keyColumn] ? record[keyColumn].toString().trim() : null;
        if (key) map.set(key, record[valueColumn].toString());
    }
    console.log(`[OK] Mapeamento da aba '${sheetName}' carregado com ${map.size} registros.`);
    return map;
}

function processAndVerifyData() {
    try {
        const xlsxFilePath = path.resolve(__dirname, '2025_07_16_OrdersBrilho_POS.xlsx');
        if (!fs.existsSync(xlsxFilePath)) {
            throw new Error(`Arquivo '${path.basename(xlsxFilePath)}' não encontrado na pasta 'database'.`);
        }
        const workbook = xlsx.readFile(xlsxFilePath);

        console.log('Carregando mapeamentos...');
        const customerMap = createMappingFromXLSX(workbook, 'Clientes', 'ClientID', 'ID Novo');
        const productMap = createMappingFromXLSX(workbook, 'Produtos', 'Cod_Produto', 'ID Novo');

        console.log('Lendo a aba "Pedidos"...');
        const ordersWorksheet = workbook.Sheets['Pedidos'];
        if (!ordersWorksheet) throw new Error("Aba 'Pedidos' não encontrada.");
        const orderRecords = xlsx.utils.sheet_to_json(ordersWorksheet);
        console.log(`[OK] Encontrados ${orderRecords.length} registros de pedidos para processar.`);

        const processedOrders = [];
        let errorCount = 0;

        for (const record of orderRecords) {
            const orderIdAntigo = record['OrderID'];
            try {
                const clientIdKey = record['ClientID'] ? record['ClientID'].toString().trim() : null;
                const customerId = customerMap.get(clientIdKey);
                if (!customerId) throw new Error(`Cliente com ClientID '${clientIdKey}' não mapeado.`);
                
                const itemCodes = (record['Itens'] || '').toString().split(';').map(s => s.trim());
                const quantities = (record['Quantidades'] || '').toString().split(';').map(q => parseFloat(q.trim().replace(',', '.')));
                if (itemCodes.length !== quantities.length) throw new Error(`Inconsistência entre número de itens e quantidades.`);
                
                const orderItems = [];
                for (let i = 0; i < itemCodes.length; i++) {
                    const productCodeKey = itemCodes[i];
                    const productId = productMap.get(productCodeKey);
                    if (!productId) throw new Error(`Produto com Cod_Produto '${productCodeKey}' não mapeado.`);
                    
                    const productInfo = db.prepare('SELECT price FROM products WHERE product_id = ?').get(productId);
                    if (!productInfo) throw new Error(`Produto ID '${productId}' não encontrado no banco de dados.`);
                    
                    orderItems.push({
                        product_id: parseInt(productId),
                        quantity: quantities[i],
                        unit_price: productInfo.price,
                    });
                }
                
                const totalAmount = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
                
                // --- MELHORIA PRINCIPAL AQUI ---
                // Esta função agora define o horário para 09:00 (UTC-3), que é 12:00 UTC
                const excelDateToJS = (serial) => {
                    if (!serial) return null;
                    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
                    date.setUTCHours(12, 0, 0, 0); // Define o horário para 09:00 no fuso de Campinas (GMT-3)
                    return date;
                };
                
                const createdAt = excelDateToJS(record['Data_Solicitado']).toISOString();
                const pickupDatetime = excelDateToJS(record['Data_Planejada'])?.toISOString() || null;
                const completedAt = excelDateToJS(record['Data_Entregue'])?.toISOString() || createdAt;

                const orderPayload = {
                    id_antigo: orderIdAntigo,
                    customer_id: customerId,
                    total_amount: Math.round(totalAmount),
                    created_at: createdAt,
                    pickup_datetime: pickupDatetime,
                    completed_at: completedAt,
                    paid_at: completedAt,
                    execution_status: 'CONCLUIDO',
                    payment_status: 'PAGO',
                    items: orderItems,
                    payments: [{
                        method: 'DINHEIRO',
                        amount: Math.round(totalAmount),
                        paid_at: completedAt,
                    }]
                };
                processedOrders.push(orderPayload);

            } catch (error) {
                console.error(`[ERRO] Pedido Antigo #${orderIdAntigo}: ${error.message}`);
                errorCount++;
            }
        }

        if (errorCount > 0) {
            console.warn(`\nAVISO: ${errorCount} pedidos continham erros e não foram incluídos no arquivo de saída.`);
        }
        
        const outputPath = path.resolve(__dirname, 'migracao_pronta.json');
        fs.writeFileSync(outputPath, JSON.stringify(processedOrders, null, 2));

        console.log(`\n--- Concluído! ---`);
        console.log(`[SUCESSO] ${processedOrders.length} pedidos foram processados e salvos em:`);
        console.log(outputPath);

    } catch (error) {
        console.error("\n[ERRO FATAL] A operação foi interrompida:", error.message);
    }
}

processAndVerifyData();