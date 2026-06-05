# Sistema Gastronômico

Este projeto é um sistema de gestão gastronômica completo, com:
- Autenticação de usuários (login / registro)
- Gestão de itens do cardápio
- Gestão de pedidos
- Dashboard administrativo simples

## Estrutura do projeto

- `backend/` - API Node.js com Express, SQLite e autenticação JWT
- `frontend/` - Aplicação React + Vite

## Como usar

### Backend

```powershell
cd "c:\Users\joaop\Documents\UNIARA trabalho Mirela\backend"
npm install
npm start
```

### Frontend

```powershell
cd "c:\Users\joaop\Documents\UNIARA trabalho Mirela\frontend"
npm install
npm run dev
```

O backend roda em `http://localhost:4000` e o frontend em `http://localhost:5173`.

## Funcionalidades

- Cadastro e login de usuários
- CRUD de itens do menu
- Criação e listagem de pedidos
- Tela de cozinha em tempo real para ver pedidos ativos
- Controle editável de estoque / inventário
- Dashboard com páginas de cardápio, pedidos, estoque e perfil

## Observação

Se quiser, posso adaptar este app para rodar com Docker, MSSQL ou outra tecnologia específica.
