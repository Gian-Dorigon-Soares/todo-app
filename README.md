# Tarefas

Aplicação web simples de lista de tarefas (to-do list). Front-end em React, back-end em Node.js/Express e banco PostgreSQL. Interface em CSS puro, sem framework de UI.

## Funcionalidades

- Adicionar, listar, editar e excluir tarefas
- Pesquisa por título e descrição (aplicada à tela atual)
- Tela principal: tarefas do dia
- Tela de pendentes (independente de data, ordenadas por data crescente)
- Tela de concluídas (ordenadas por data decrescente)
- Tarefa aberta: concluir (ou reabrir), reagendar, editar e excluir
- Layout responsivo (barra lateral no desktop, navegação inferior no mobile)

## Campos da tarefa

| Campo | Tipo | Regra |
|---|---|---|
| `title` | texto curto | obrigatório, até 120 caracteres |
| `description` | texto livre | opcional, até 2000 caracteres |
| `due_date` | data (`YYYY-MM-DD`) | obrigatória, deve ser uma data válida |
| `status` | `pending` \| `completed` | padrão `pending` |

## Tecnologias

- React 18 + Vite
- Node.js 20+ com Express 4
- PostgreSQL 16 (driver `pg`)
- CSS puro

## Como rodar

Pré-requisitos: Node.js 20+ e Docker (ou uma instância PostgreSQL própria).

```bash
# 1. Banco de dados
docker compose up -d

# 2. Back-end (http://localhost:3001)
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Front-end (http://localhost:5173)
cd frontend
npm install
npm run dev
```

A tabela é criada automaticamente na inicialização do back-end (`backend/src/schema.sql`, idempotente). Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:3001`.

### Variáveis de ambiente

Back-end (`backend/.env`):

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `DATABASE_URL` | `postgres://todo:todo@localhost:5432/todo` | Conexão PostgreSQL |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem permitida |

Front-end: `VITE_API_URL` (opcional, padrão `/api`) para apontar a outra URL de API em produção.

### Build de produção do front-end

```bash
cd frontend && npm run build   # saída em frontend/dist
```

## API

Base: `/api`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/tasks?view=today\|pending\|completed&date=YYYY-MM-DD&q=texto` | Lista tarefas. `date` é obrigatório na prática para `view=today` (padrão: data UTC do servidor) |
| GET | `/tasks/:id` | Busca uma tarefa |
| POST | `/tasks` | Cria (`title`, `description`, `due_date`) |
| PUT | `/tasks/:id` | Edita (`title`, `description`, `due_date`) |
| PATCH | `/tasks/:id/status` | Altera status (`{ "status": "completed" }`) |
| PATCH | `/tasks/:id/reschedule` | Reagenda (`{ "due_date": "YYYY-MM-DD" }`) |
| DELETE | `/tasks/:id` | Exclui |
| GET | `/health` | Healthcheck |

Erros de validação retornam `400` com `{ "error": "...", "details": { "campo": "mensagem" } }`.

## Estrutura

```
.
├── docker-compose.yml
├── AGENTS.md
├── backend/
│   └── src/
│       ├── server.js        # bootstrap Express
│       ├── db.js            # pool pg e init do schema
│       ├── schema.sql
│       ├── validation.js
│       └── routes/tasks.js
└── frontend/
    └── src/
        ├── main.jsx
        ├── App.jsx          # navegação, busca, estado global
        ├── api.js           # cliente HTTP
        ├── styles.css
        ├── components/      # Modal, TaskList, TaskDetail, TaskForm
        └── utils/date.js
```

## Documentação para agentes de IA

Veja [`AGENTS.md`](./AGENTS.md).
