import { Router } from 'express';
import { pool } from '../db.js';
import { isValidDate, validateDueDate, validateTaskInput } from '../validation.js';

const router = Router();
const COLUMNS = 'id, title, description, due_date, status, created_at, updated_at';
const INT4_MAX = 2147483647;
// Teto para a listagem: sem ele, GET /api/tasks devolve a tabela inteira.
const MAX_ROWS = 1000;

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const badRequest = (res, errors) => res.status(400).json({ error: 'Dados inválidos.', details: errors });
const notFound = (res) => res.status(404).json({ error: 'Tarefa não encontrada.' });

function parseId(req, res, next) {
  // IDs fora do range de int4 fariam o Postgres estourar (500); aqui viram 404.
  if (!/^\d{1,10}$/.test(req.params.id)) return notFound(res);
  const id = Number(req.params.id);
  if (id < 1 || id > INT4_MAX) return notFound(res);
  req.taskId = id;
  next();
}

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

/** Data local do servidor (o fallback anterior usava UTC e virava o dia após as 21h). */
function localTodayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * GET /api/tasks?view=today|pending|completed&date=YYYY-MM-DD&q=texto
 *  - today:     due_date = date (pendentes primeiro)
 *  - pending:   status = pending, due_date ASC
 *  - completed: status = completed, due_date DESC
 *  - sem view:  todas, due_date DESC
 */
router.get('/', wrap(async (req, res) => {
  const { view, q } = req.query;
  const where = [];
  const params = [];
  let orderBy = 'due_date DESC, id DESC';

  if (view === 'today') {
    const date = req.query.date ?? localTodayISO();
    if (!isValidDate(date)) return badRequest(res, { date: 'Data inválida.' });
    params.push(date);
    where.push(`due_date = $${params.length}`);
    orderBy = "(status = 'completed'), id ASC";
  } else if (view === 'pending') {
    where.push("status = 'pending'");
    orderBy = 'due_date ASC, id ASC';
  } else if (view === 'completed') {
    where.push("status = 'completed'");
    orderBy = 'due_date DESC, id DESC';
  } else if (view !== undefined) {
    return badRequest(res, { view: 'View inválida.' });
  }

  // Byte NUL é rejeitado pelo Postgres; sanitiza a busca em vez de estourar 500.
  if (typeof q === 'string' && q.includes('\u0000')) return badRequest(res, { q: 'Pesquisa inválida.' });

  if (typeof q === 'string' && q.trim()) {
    params.push(`%${escapeLike(q.trim())}%`);
    where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  params.push(MAX_ROWS);
  const sql = `SELECT ${COLUMNS} FROM tasks ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy} LIMIT $${params.length}`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

router.get('/:id', parseId, wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [req.taskId]);
  if (!rows[0]) return notFound(res);
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  const { errors, data } = validateTaskInput(req.body);
  if (Object.keys(errors).length) return badRequest(res, errors);
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, due_date) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [data.title, data.description, data.due_date],
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', parseId, wrap(async (req, res) => {
  const { errors, data } = validateTaskInput(req.body);
  if (Object.keys(errors).length) return badRequest(res, errors);
  const { rows } = await pool.query(
    `UPDATE tasks SET title = $1, description = $2, due_date = $3, updated_at = now()
     WHERE id = $4 RETURNING ${COLUMNS}`,
    [data.title, data.description, data.due_date, req.taskId],
  );
  if (!rows[0]) return notFound(res);
  res.json(rows[0]);
}));

router.patch('/:id/status', parseId, wrap(async (req, res) => {
  const { status } = req.body ?? {};
  if (!['pending', 'completed'].includes(status)) return badRequest(res, { status: 'Status inválido.' });
  const { rows } = await pool.query(
    `UPDATE tasks SET status = $1, updated_at = now() WHERE id = $2 RETURNING ${COLUMNS}`,
    [status, req.taskId],
  );
  if (!rows[0]) return notFound(res);
  res.json(rows[0]);
}));

router.patch('/:id/reschedule', parseId, wrap(async (req, res) => {
  const { due_date } = req.body ?? {};
  const dateError = validateDueDate(due_date);
  if (dateError) return badRequest(res, { due_date: dateError });
  const { rows } = await pool.query(
    `UPDATE tasks SET due_date = $1, updated_at = now() WHERE id = $2 RETURNING ${COLUMNS}`,
    [due_date, req.taskId],
  );
  if (!rows[0]) return notFound(res);
  res.json(rows[0]);
}));

router.delete('/:id', parseId, wrap(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [req.taskId]);
  if (!rowCount) return notFound(res);
  res.status(204).end();
}));

export default router;
