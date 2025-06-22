const db = require('./database.js');

// Lista de produtos completa, baseada na sua imagem e organizada em novas categorias.
// **ATENÇÃO: AJUSTE OS PREÇOS (EM CENTAVOS) CONFORME SUA TABELA REAL**
const products = [
    // --- Serviço por Peso ---
    { name: 'Lavar e Passar por KG', price: 2900, category: 'SERVIÇO POR PESO', unit_of_measure: 'KG' },
    { name: 'Passadoria por KG', price: 2290, category: 'SERVIÇO POR PESO', unit_of_measure: 'KG' },
    { name: 'Lava e Dobra Cesto 5kg', price: 2500, category: 'SERVIÇO POR PESO', unit_of_measure: 'UN' },


    // --- Roupas do Dia a Dia ---
    { name: 'Camiseta', price: 700, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Camisa Polo', price: 800, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Moletom / Blusão', price: 1800, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Calça Jeans', price: 1800, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Bermuda / Shorts', price: 800, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Bermuda Jeans', price: 1200, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },
    { name: 'Blusinha Feminina', price: 700, category: 'ROUPAS DO DIA A DIA', unit_of_measure: 'UN' },

    // --- Peças Sociais & Delicadas ---
    { name: 'Camisa Social', price: 1400, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Blusa Delicada', price: 2000, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Calça Social', price: 1900, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Saia Simples', price: 790, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Saia Plissada / Longa', price: 1000, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Vestido Simples', price: 1500, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Vestido de Festa', price: 4900, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Paletó / Blazer', price: 2900, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Terno Completo (2 peças)', price: 4800, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },
    { name: 'Gravata', price: 1500, category: 'PEÇAS SOCIAIS E DELICADAS', unit_of_measure: 'UN' },

    // --- Casacos e Agasalhos ---
    { name: 'Cardigan / Suéter', price: 3000, category: 'CASACOS E AGASALHOS', unit_of_measure: 'UN' },
    { name: 'Jaqueta Simples', price: 2900, category: 'CASACOS E AGASALHOS', unit_of_measure: 'UN' },
    { name: 'Sobretudo / Casaco Longo', price: 2900, category: 'CASACOS E AGASALHOS', unit_of_measure: 'UN' },
    { name: 'Jaqueta de Plumas (Down Jacket)', price: 4900, category: 'CASACOS E AGASALHOS', unit_of_measure: 'UN' },

    // --- Roupa de Cama e Banho ---
    { name: 'Lençol Solteiro', price: 1500, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Lençol Casal', price: 1800, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Fronha', price: 5900, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Edredom Solteiro', price: 3400, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Edredom Casal/Queen', price: 3900, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Edredom King', price: 4500, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobertor Solteiro', price: 3400, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobertor Casal/Queen', price: 3900, category: 'CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobertor King', price: 4500, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobre-Leito Solteiro', price: 3000, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobre-Leito Casal/Queen', price: 3400, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Cobre-Leito King', price: 3900, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Toalha de Rosto', price: 500, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },
    { name: 'Toalha de Banho', price: 1000, category: 'ROUPA DE CAMA E BANHO', unit_of_measure: 'UN' },

    // --- Itens Especiais ---
    { name: 'Tapete (m²)', price: 3000, category: 'ITENS ESPECIAIS', unit_of_measure: 'M2' },
    { name: 'Cortina (m²)', price: 2500, category: 'ITENS ESPECIAIS', unit_of_measure: 'M2' },
    { name: 'Pelucia (cm)', price: 120, category: 'ITENS ESPECIAIS', unit_of_measure: 'CM' },
    { name: 'Outros', price: 100, category: 'ITENS ESPECIAIS', unit_of_measure: 'UN' },
];

/**
 * Insere os produtos no banco de dados.
 * A função é transacional para garantir que ou todos os produtos são inseridos, ou nenhum é.
 * Ela também verifica se um produto com o mesmo nome já existe para evitar duplicatas.
 */
function seedProducts() {
    console.log('Iniciando o povoamento da tabela de produtos com a lista completa...');

    const insert = db.prepare(`
        INSERT INTO products (name, price, category, unit_of_measure) 
        VALUES (@name, @price, @category, @unit_of_measure)
    `);

    const insertMany = db.transaction((items) => {
        let insertedCount = 0;
        let skippedCount = 0;
        for (const item of items) {
            // Verifica se o produto já existe antes de inserir
            const existing = db.prepare('SELECT 1 FROM products WHERE name = ?').get(item.name);
            if (!existing) {
                insert.run(item);
                insertedCount++;
            } else {
                skippedCount++;
            }
        }
        console.log(`> Inseridos: ${insertedCount} novos produtos.`);
        console.log(`> Ignorados: ${skippedCount} produtos já existentes.`);
    });

    try {
        insertMany(products);
        console.log('✅ Povoamento da tabela de produtos concluído com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao popular a tabela de produtos:', err.message);
    }
}

// Executa a função
seedProducts();