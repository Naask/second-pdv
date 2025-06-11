// database/database.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Caminho para o arquivo do banco de dados
const dbPath = path.resolve(__dirname, 'lavanderia_ledger.db');

// Verifica se o arquivo do banco de dados já existe
const dbExists = fs.existsSync(dbPath);

// Cria uma nova instância do banco de dados ou conecta a uma existente
const db = new Database(dbPath, { verbose: console.log });

// Se o banco de dados não existia, inicializamos o schema
if (!dbExists) {
  console.log('Criando o schema do banco de dados pela primeira vez...');
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('Schema do banco de dados criado com sucesso.');
  } catch (error) {
    console.error('Erro ao criar o schema do banco de dados:', error);
    // Se a criação do schema falhar, removemos o arquivo de DB vazio para tentar de novo na próxima vez.
    fs.unlinkSync(dbPath);
    process.exit(1); // Encerra o processo se a inicialização do DB falhar
  }
} else {
  console.log('Conectado ao banco de dados existente.');
}

// Garante que o banco de dados será fechado corretamente ao sair do processo
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

// Exporta a instância do banco de dados para ser usada em outras partes da aplicação
module.exports = db;