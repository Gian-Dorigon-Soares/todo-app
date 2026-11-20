import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { initDb, pool } from './db.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

// Origens permitidas: lista separada por vírgulas. "*" libera todas (não recomendado).
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAnyOrigin = corsOrigins.includes('*');
if (allowAnyOrigin) console.warn('CORS_ORIGIN=*: qualquer origem pode chamar a API. Evite em produção.');

// Token compartilhado opcional. Sem API_TOKEN a API segue aberta (uso local).
const apiToken = process.env.API_TOKEN?.trim() || '';

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function requireToken(req, res, next) {
  if (!apiToken) return next();
  const [scheme, value = ''] = (req.get('authorization') || '').split(' ');
  if (scheme === 'Bearer' && value && safeEqual(value, apiToken)) return next();
  return res.status(401).json({ error: 'Não autorizado.' });
}

// Só confie em X-Forwarded-For quando a API estiver de fato atrás de um proxy.
// Aceita o formato do Express: número de hops, "loopback", lista de IPs, "true".
const trustProxy = (process.env.TRUST_PROXY || '').trim();
app.set('trust proxy', !trustProxy || trustProxy === 'false' ? false : trustProxy);
app.disable('x-powered-by');
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Math.max(1, Number(process.env.RATE_LIMIT_MAX) || 300),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Um cliente enviando X-Forwarded-For não deve derrubar a request.
  validate: { xForwardedForHeader: false },
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

app.use(cors({ origin: allowAnyOrigin ? true : corsOrigins }));
app.use(express.json({ limit: '100kb' }));

// Healthcheck fica fora do limitador e da autenticação (monitoramento).
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', limiter, requireToken);
app.use('/api/tasks', tasksRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisição muito grande.' });
  // Erros do body-parser (charset/encoding/limite) são 4xx e não devem virar 500.
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Requisição inválida.' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

let server;
try {
  await initDb();
  server = app.listen(port, () => console.log(`API em http://localhost:${port}`));
} catch (err) {
  console.error('Falha ao inicializar o banco de dados:', err.message);
  process.exit(1);
}

// Encerramento gracioso: para de aceitar conexões e fecha o pool.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Recebido ${signal}, encerrando…`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async (err) => {
    try {
      await pool.end();
    } catch (poolErr) {
      console.error('Erro ao fechar o pool:', poolErr.message);
    }
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
