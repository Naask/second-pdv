# PDV Lavanderia - Sistema Aprimorado

Este é um sistema de Ponto de Venda (PDV) aprimorado para lavanderias, desenvolvido com Node.js, Express e SQLite no backend, e HTML/CSS/JavaScript modular no frontend.

O sistema é projetado em torno de um livro-razão (ledger) individual por cliente, garantindo a integridade e a rastreabilidade de todas as transações financeiras, incluindo a gestão de saldos principais e de bônus.

## Funcionalidades Principais

-   **Gestão de Clientes:** Cadastro e busca de clientes.
-   **Livro-Razão (Ledger) por Cliente:** Cada cliente possui um extrato financeiro detalhado e imutável.
-   **Gestão de Saldos:** Separação e controle de saldo principal e saldo de bônus.
-   **Operações Financeiras:**
    -   Registro de vendas.
    -   Adição de créditos pré-pagos.
    -   Compra de pacotes de crédito com bônus.
    -   Aplicação de descontos.
    -   Correções manuais de saldo.
-   **API RESTful:** Backend robusto para servir os dados ao frontend.
-   **Interface Reativa:** Frontend modular construído com JavaScript puro (ES Modules) para uma experiência de usuário fluida.

## Estrutura do Projeto

src/
├── app.js                   # Configuração principal do Express, middlewares globais
├── server.js                # Inicialização do servidor HTTP
├── config/                  # Configurações (variáveis de ambiente, banco de dados)
│   ├── index.js             # Exporta todas as configurações
│   └── database.js          # Configuração e conexão com SQLite (better-sqlite3)
├── api/                     # Lógica da API, versionada (ex: v1)
│   └── v1/
│       ├── routes/          # Definições de rotas para cada recurso
│       │   ├── customerRoutes.js
│       │   ├── orderRoutes.js
│       │   └── index.js     # Agrega todas as rotas da v1
│       ├── controllers/     # Manipuladores de requisição/resposta
│       │   ├── customerController.js
│       │   └── orderController.js
│       ├── services/        # Lógica de negócios
│       │   ├── ledgerService.js
│       │   ├── customerService.js
│       │   └── orderService.js
│       ├── models/          # Lógica de interação com o banco de dados (camada de acesso a dados)
│       │   ├── ledgerTransactionModel.js
│       │   ├── customerModel.js
│       │   └── orderModel.js
│       ├── middlewares/     # Middlewares customizados (autenticação, tratamento de erros, validação)
│       │   ├── errorHandler.js
│       │   ├── requestValidator.js
│       │   └── authMiddleware.js # Consideração futura
│       └── schemas/         # Esquemas de validação (ex: Joi/Zod)
│           ├── customerSchemas.js
│           └── orderSchemas.js
public/                      # Arquivos estáticos do frontend (HTML, CSS, JS)
├── index.html
├── script.js
└── styles.css
database/
└── laundry_pdv.sqlite       # Arquivo do banco de dados SQLite
tests/                       # Testes unitários, de integração, e2e
├── unit/
├── integration/
.env                         # Variáveis de ambiente
package.json
README.md

## Setup e Instalação

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 16.x ou superior)
-   [npm](https://www.npmjs.com/) (geralmente instalado com o Node.js)

### Passos

1.  **Clone o repositório ou extraia os arquivos:**
    Coloque todos os arquivos do projeto em um diretório local.

2.  **Instale as dependências:**
    Navegue até o diretório raiz do projeto e execute o comando:
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo chamado `.env` na raiz do projeto e adicione o seguinte conteúdo (você pode ajustar a porta se necessário):
    ```
    PORT=3000
    ```

4.  **Inicialize o Banco de Dados:**
    A primeira vez que o servidor for iniciado, ele criará automaticamente o arquivo do banco de dados (`lavanderia_ledger.db`) e as tabelas definidas em `database/schema.sql`.

## Como Executar

Para iniciar o servidor, execute o seguinte comando no terminal, a partir da raiz do projeto:

```bash
npm start