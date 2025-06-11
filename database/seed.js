// database/seed.js
// Este script serve para popular o banco de dados com dados iniciais,
// como a lista de produtos. Execute-o uma única vez após criar o banco.

const db = require('./database.js'); // Conecta ao nosso banco já existente

const products = [
    { name: 'Lavar e passar por KG', price: 2900, category: 'PESO', unit_of_measure: 'KG' },
    { name: 'Passar por KG', price: 2290, category: 'PESO', unit_of_measure: 'KG' },
    { name: 'Edredom Solteiro', price: 3400, category: 'ROUPAS DE CAMA', unit_of_measure: 'UN' },
    { name: 'Edredom Casal', price: 3900, category: 'ROUPAS DE CAMA', unit_of_measure: 'UN' },
];

function seedProducts() {
    console.log('Iniciando o povoamento da tabela de produtos...');

    const insert = db.prepare(`
        INSERT INTO products (name, price, category, unit_of_measure) 
        VALUES (@name, @price, @category, @unit_of_measure)
    `);

    const insertMany = db.transaction((items) => {
        for (const item of items) {
            // Verifica se o produto já existe antes de inserir
            const existing = db.prepare('SELECT 1 FROM products WHERE name = ?').get(item.name);
            if (!existing) {
                insert.run(item);
            }
        }
    });

    try {
        insertMany(products);
        console.log(`✅ Povoamento da tabela de produtos concluído com sucesso.`);
    } catch (err) {
        console.error('❌ Erro ao popular a tabela de produtos:', err.message);
    }
}

// Executa a função
seedProducts();