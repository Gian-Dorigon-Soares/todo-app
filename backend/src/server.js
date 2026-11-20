import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initDb } from './db.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/tasks', tasksRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

try {
  await initDb();
  app.listen(port, () => console.log(`API em http://localhost:${port}`));
} catch (err) {
  console.error('Falha ao inicializar o banco de dados:', err.message);
  process.exit(1);
}
