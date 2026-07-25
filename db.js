import pg from 'pg';

const { Pool } = pg;

function getConnectionString() {
  const candidates = ['DATABASE_URL', 'DB_URL', 'POSTGRES_URL', 'POSTGRES_PRIVATE_URL'];
  for (const key of candidates) {
    if (process.env[key]) {
      console.log(`Using DB env: ${key}`);
      return process.env[key];
    }
  }
  console.warn('WARNING: No database env variable found!');
  return null;
}

function cleanConnString(cs) {
  return cs.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?$/, '');
}

let pool = null;

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured.');
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('DB query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
}

async function tryConnect(cs) {
  const sslOptions = [
    { rejectUnauthorized: false },
    true,
    false,
  ];
  for (const ssl of sslOptions) {
    try {
      console.log(`Trying connection with ssl=${JSON.stringify(ssl)}...`);
      const p = new Pool({ connectionString: cs, ssl });
      const res = await p.query('SELECT NOW() AS now');
      console.log('Connection OK! Server time:', res.rows[0].now);
      return p;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }
  return null;
}

export async function initDb() {
  const connString = getConnectionString();
  if (!connString) {
    console.error('initDb: No connection string found.');
    throw new Error('DATABASE_URL not set');
  }

  const cleaned = cleanConnString(connString);

  const p = await tryConnect(cleaned);
  if (!p) {
    console.error('initDb: All connection attempts failed.');
    throw new Error('Cannot connect to database — all SSL modes failed.');
  }

  pool = p;
  pool.on('error', (err) => console.error('DB pool error:', err.message));

  // kreiraj tabele
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

  // Tabela kategorija
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('prihod', 'rashod')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name, type)
    );
  `);

  // Ukloni stari CHECK constraint sa transactions.kategorija (ako postoji)
  try {
    await pool.query(`
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_kategorija_check;
    `);
    console.log('Old CHECK constraint dropped (if existed).');
  } catch (err) {
    console.log('No old constraint to drop:', err.message);
  }

  console.log('Database tables ready.');
}

export default pool;
