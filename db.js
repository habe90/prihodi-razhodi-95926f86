import pg from 'pg';

const { Pool } = pg;

function getConnectionString() {
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
  console.warn('WARNING: No database env variable found!');
  return null;
}

const connString = getConnectionString();

// Ukloni ?sslmode=... ili &sslmode=... iz connection stringa
// da ne bude konflikta sa ssl objektom
function cleanConnString(cs) {
  return cs.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?$/, '');
}

let pool = null;

const sslOptions = [
  { rejectUnauthorized: false },
  true,
  false,
];

async function tryConnect(cs) {
  for (const ssl of sslOptions) {
    try {
      console.log(`Trying connection with ssl=${JSON.stringify(ssl)}...`);
      const p = new Pool({
        connectionString: cs,
        ssl,
      });
      const res = await p.query('SELECT NOW() AS now');
      console.log('Connection OK! Server time:', res.rows[0].now);
      return p;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }
  return null;
}

if (connString) {
  const cleaned = cleanConnString(connString);
  pool = await tryConnect(cleaned);
  if (!pool) {
    console.error('All connection attempts failed.');
    // kreiraj dummy pool koji ne radi — query() će baciti grešku
    pool = new Pool({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  }
  pool.on('error', (err) => {
    console.error('DB pool error:', err.message);
  });
} else {
  console.error('No connection string — database disabled.');
}

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured.');
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('DB query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
}

export async function initDb() {
  if (!pool) throw new Error('DATABASE_URL not set');

  // ponovo pokušaj konekciju ako prvi pokušaj nije uspeo
  if (connString) {
    const cleaned = cleanConnString(connString);
    const p = await tryConnect(cleaned);
    if (p) {
      pool = p;
      pool.on('error', (err) => console.error('DB pool error:', err.message));
    }
  }

  // test query
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
