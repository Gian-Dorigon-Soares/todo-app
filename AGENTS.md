# AGENTS.md

Documentação para agentes de IA que trabalham neste repositório.

## Visão geral

Aplicação de to-do list. Monorepo simples com duas pastas independentes:

- `backend/`: API REST (Node.js 20+, Express 4, `pg`, `helmet`, `express-rate-limit`, ES Modules)
- `frontend/`: SPA React 18 + Vite 6, CSS puro

Banco: PostgreSQL (`docker-compose.yml` sobe a instância de desenvolvimento, publicada só em `127.0.0.1`).

## Princípios do projeto

- Manter simples. Sem over-engineering: sem ORM, sem state manager, sem router, sem TypeScript, sem framework de UI/CSS.
- Dependências novas só com justificativa clara.
- Texto de interface e mensagens de erro em português (pt-BR). Código, nomes e colunas em inglês.

## Comandos

```bash
cp .env.example .env                 # credenciais do compose (opcional em dev)
docker compose up -d                 # PostgreSQL
cd backend  && npm install && npm run dev    # API :3001
cd frontend && npm install && npm run dev    # Web :5173
cd frontend && npm run build                 # build de produção
```

Não há suíte de testes configurada.

## Modelo de dados

Tabela `tasks` (`backend/src/schema.sql`, aplicada na inicialização com `CREATE ... IF NOT EXISTS`):

`id SERIAL`, `title VARCHAR(120) NOT NULL`, `description TEXT NOT NULL DEFAULT ''`, `due_date DATE NOT NULL`, `status` (`'pending' | 'completed'`), `created_at`, `updated_at`.

Não há sistema de migrations. Alterações de schema exigem decisão explícita (adicionar migrations ou `ALTER` idempotente).

## Contrato da API

Ver tabela em `README.md`. Definição de cada view em `GET /api/tasks`:

| view | filtro | ordenação |
|---|---|---|
| `today` | `due_date = date` (todos os status) | pendentes primeiro, depois `id` ASC |
| `pending` | `status = 'pending'` (qualquer data) | `due_date` ASC |
| `completed` | `status = 'completed'` | `due_date` DESC |

`q` filtra por `ILIKE` em `title` e `description` dentro da view. O cliente envia `date` com a data local do navegador para evitar divergência de fuso.

## Regras de validação

Implementadas em dois lugares que devem permanecer equivalentes:

- Servidor (fonte de verdade): `backend/src/validation.js`
- Cliente (UX): `frontend/src/components/TaskForm.jsx` e `frontend/src/utils/date.js`

Regras: `title` obrigatório (trim, máx. 120); `description` máx. 2000 (trim); `due_date` no formato `YYYY-MM-DD`, data de calendário existente, ano entre 1970 e 2100. Byte NUL (`\u0000`) é rejeitado no servidor (título, descrição e `q`).

## Segurança

- `server.js` aplica, nesta ordem: `helmet` → CORS (lista de origens) → `express.json` → rate limit → `API_TOKEN` (opcional) → rotas. `/api/health` fica fora do limitador e do token.
- `API_TOKEN` vazio desliga a autenticação (uso local). `RATE_LIMIT_MAX` (padrão 300/15 min) e `TRUST_PROXY` (hops de proxy) vêm do `.env`.
- Rate limit em memória: múltiplas instâncias da API não compartilham contadores.
- `parseId` rejeita IDs fora de `/^\d{1,10}$/` ou > `int4` (2147483647) com 404, antes de chegar ao Postgres.
- `GET /api/tasks` tem `LIMIT 1000` (`MAX_ROWS`); não há paginação por cursor.
- O middleware de erro preserva `err.status` 4xx (400 JSON inválido, 413 payload grande, 415 charset) e só loga/retorna 500 no resto.

## Convenções e armadilhas

- Datas trafegam sempre como string `YYYY-MM-DD`. O parser do `pg` para `DATE` (OID 1082) é sobrescrito em `db.js` para não converter em `Date`. Não usar `new Date('YYYY-MM-DD')` no cliente (interpreta como UTC); usar os helpers de `utils/date.js`.
- O fallback de data do servidor (quando `view=today` vem sem `date`) é a data **local** do processo, não UTC.
- Queries usam parâmetros (`$1`, `$2`). Nunca interpolar entrada do usuário no SQL.
- Handlers async são envolvidos por `wrap()` em `routes/tasks.js`; erros caem no middleware de erro de `server.js`.
- Pool (`db.js`) tem `pool.on('error')`, `connectionTimeoutMillis`, `statement_timeout` e `query_timeout`. `server.js` faz shutdown gracioso em SIGINT/SIGTERM (`server.close` + `pool.end`).
- No front-end, `App.jsx` concentra o estado (view, busca, tarefa aberta, formulário). Após qualquer mutação, a lista é recarregada via `load()`, que cancela a request anterior (`AbortController`) e descarta respostas fora de ordem (`requestRef`). Não remover esse guarda.
- `useToday()` em `App.jsx` atualiza a data na meia-noite e no `visibilitychange`; use `today` do hook em vez de chamar `todayISO()` no render.
- Modais usam `<dialog>` nativo (`components/Modal.jsx`). `TaskForm` confirma antes de descartar alterações; `TaskDetail` volta ao detalhe ao fechar durante reagendar/excluir.
- Estilos ficam em `frontend/src/styles.css` com variáveis CSS em `:root`. Breakpoint mobile: `720px`.

## Checklist ao alterar

1. Mudou a API: atualizar `README.md`, este arquivo e `frontend/src/api.js`.
2. Mudou validação: atualizar servidor e cliente.
3. Rodar `npm run build` em `frontend/` e `node --check` nos arquivos do backend.
4. Mudou dependências: rodar `npm audit` em `backend/` e `frontend/` (esperado: 0 vulnerabilidades).
