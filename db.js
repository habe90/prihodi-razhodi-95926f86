import pg from 'pg';

const { Pool } = pg;

function getConnectionString() {
  // probaj više varijanti env varijabli za bazu
  const candidates = [
    'DATABASE_URL',
    'DB_URL',
    'POSTGRES_URL',
    'POSTGRES_PRIVATE_URL',
  ];
  for (const key of candidates) {
    if (process.env[key]) {
      console.log(`Using DB env: ${key}`);
      return process.env[key];
    }
  }
  console.warn('WARNING: No database env variable found! Tried:', candidates.join(', '));
  return null;
}

const connString = getConnectionString();

const pool = connString
  ? new Pool({
      connectionString: connString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('DB pool error:', err.message);
  });
}

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured — no connection string.');
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('DB query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
}

export async function initDb() {
  if (!pool) {
    console.error('initDb: No pool — database connection string not found.');
    throw new Error('DATABASE_URL not set');
  }

  // prvo probaj prostu konekciju
  console.log('Testing DB connection...');
  const test = await pool.query('SELECT NOW() AS now');
  console.log('DB connection OK, server time:', test.rows[0].now);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      naziv VARCHAR(255) NOT NULL,
      iznos NUMERIC(12,2) NOT NULL,
      kategorija VARCHAR(20) NOT NULL CHECK (kategorija IN ('prihod', 'rashod')),
      datum DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Database tables ready.');
}

export default pool;
