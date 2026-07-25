import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import summaryRoutes from './routes/summary.js';
import { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Globalno stanje baze
let dbReady = false;

app.use(cors());
app.use(express.json());

// Middleware — proveri da li je baza spremna za API rute
function requireDb(_req, res, next) {
  if (!dbReady) {
    return res.status(503).json({ error: 'Baza nije dostupna, pokušajte ponovo za trenutak.' });
  }
  next();
}

// API rute
app.get('/api/debug', (_req, res) => {
  const envKeys = ['DATABASE_URL', 'DB_URL', 'POSTGRES_URL', 'POSTGRES_PRIVATE_URL', 'PORT', 'NODE_ENV'];
  const env = {};
  for (const k of envKeys) {
    const v = process.env[k];
    env[k] = v ? `${v.slice(0, 25)}...` : 'NOT SET';
  }
  res.json({ env, dbReady });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: dbReady ? 'connected' : 'pending',
    time: new Date().toISOString(),
  });
});

app.use('/api', requireDb, authRoutes);
app.use('/api/transactions', requireDb, transactionRoutes);
app.use('/api/summary', requireDb, summaryRoutes);

// Serviraj statički frontend build
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

async function start() {
  console.log('Starting server...');
  console.log('PORT:', PORT);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

  // Pokušaj inicijalizaciju baze, ali ne blokiraj startovanje servera
  try {
    await initDb();
    dbReady = true;
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database init failed (server will start without DB):', err.message);
    // probaj ponovo za 5 sekundi
    setTimeout(async () => {
      try {
        await initDb();
        dbReady = true;
        console.log('Database initialized on retry.');
      } catch (retryErr) {
        console.error('Database retry also failed:', retryErr.message);
      }
    }, 5000);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
