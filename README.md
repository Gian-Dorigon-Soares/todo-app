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
- Cabeçalho e busca fixos no topo (título, data, botão de nova tarefa e pesquisa); apenas a lista rola
- Navegação inferior fixa no mobile

## Campos da tarefa

| Campo | Tipo | Regra |
|---|---|---|
| `title` | texto curto | obrigatório, até 120 caracteres |
| `description` | texto livre | opcional, até 2000 caracteres |
| `due_date` | data (`YYYY-MM-DD`) | obrigatória, deve ser uma data válida |
| `status` | `pending` \| `completed` | padrão `pending` |

## Tecnologias

- React 18 + Vite 6
- Node.js 20+ com Express 4
- PostgreSQL 16 (driver `pg`)
- CSS puro
- `helmet` e `express-rate-limit` no back-end

## Como rodar

Pré-requisitos: Node.js 20+ e Docker (ou uma instância PostgreSQL própria).

```bash
# 1. Banco de dados (credenciais vêm do .env da raiz; padrão de dev: todo/todo)
cp .env.example .env        # opcional: troque POSTGRES_PASSWORD
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

O Postgres do compose escuta apenas em `127.0.0.1`; as credenciais vêm de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` (arquivo `.env` na raiz, veja `.env.example`). Em ambiente compartilhado, troque a senha e mantenha o vínculo em loopback.

### Variáveis de ambiente

Back-end (`backend/.env`):

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `DATABASE_URL` | `postgres://todo:todo@localhost:5432/todo` | Conexão PostgreSQL |
| `CORS_ORIGIN` | `http://localhost:5173` | Origens permitidas, separadas por vírgula (`*` libera todas — não recomendado) |
| `API_TOKEN` | vazio | Se definido, exige `Authorization: Bearer <token>` em `/api/*` (exceto `/api/health`) |
| `RATE_LIMIT_MAX` | `300` | Requisições por IP a cada 15 minutos |
| `TRUST_PROXY` | vazio | Nº de proxies confiáveis para ler `X-Forwarded-For` (ex.: `1` atrás de Nginx) |

Front-end:

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `/api` | URL base da API |
| `VITE_API_TOKEN` | vazio | Token enviado como `Bearer` (só quando a API usa `API_TOKEN`; lembre que ele fica embutido no bundle) |

### Build de produção do front-end

```bash
cd frontend && npm run build   # saída em frontend/dist
```

## API

Base: `/api`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/tasks?view=today\|pending\|completed&date=YYYY-MM-DD&q=texto` | Lista tarefas (máx. 1000). `date` deve ser enviado para `view=today` (padrão: data local do servidor) |
| GET | `/tasks/:id` | Busca uma tarefa |
| POST | `/tasks` | Cria (`title`, `description`, `due_date`) |
| PUT | `/tasks/:id` | Edita (`title`, `description`, `due_date`) |
| PATCH | `/tasks/:id/status` | Altera status (`{ "status": "completed" }`) |
| PATCH | `/tasks/:id/reschedule` | Reagenda (`{ "due_date": "YYYY-MM-DD" }`) |
| DELETE | `/tasks/:id` | Exclui |
| GET | `/health` | Healthcheck (público, sem rate limit) |

Erros de validação retornam `400` com `{ "error": "...", "details": { "campo": "mensagem" } }`. IDs inexistentes ou fora do range de `integer` retornam `404`. Payload acima de 100kb retorna `413`.

## Segurança

Medidas aplicadas no back-end (e no compose):

- Rate limit por IP: 300 requisições / 15 min em `/api/*`, exceto `/api/health` (configurável por `RATE_LIMIT_MAX`).
- Queries parametrizadas, `q` com escape de `%`/`_`, rejeição de byte NUL e teto de 1000 linhas na listagem.

## Estrutura

```
.
├── docker-compose.yml
├── .env.example          # credenciais do compose
├── AGENTS.md
├── backend/
│   └── src/
│       ├── server.js        # bootstrap Express, helmet/CORS/rate limit/token
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
