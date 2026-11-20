import fs from 'node:fs';
import pg from 'pg';

// DATE (OID 1082) retorna como string 'YYYY-MM-DD', evitando deslocamento de fuso.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  // Evita requests pendurados quando o banco trava.
  statement_timeout: 10_000,
  query_timeout: 10_000,
});

// Sem este handler, um erro em cliente ocioso (ex.: banco reiniciando) derruba o processo.
pool.on('error', (err) => {
  console.error('Erro inesperado em cliente ocioso do pool:', err.message);
});

export async function initDb() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
}
