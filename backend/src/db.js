import fs from 'node:fs';
import pg from 'pg';

// DATE (OID 1082) retorna como string 'YYYY-MM-DD', evitando deslocamento de fuso.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
}
