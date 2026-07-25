import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function sanitize(str, maxLen = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function isValidDate(str) {
  if (!str) return false;
  const d = new Date(str);
  return d instanceof Date && !isNaN(d) && str.match(/^\d{4}-\d{2}-\d{2}$/);
}

// GET /api/transactions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.naziv, t.iznos, t.kategorija, t.datum, t.created_at,
              COALESCE(c.type, 'rashod') AS tip
       FROM transactions t
       LEFT JOIN categories c ON c.name = t.kategorija AND c.user_id = t.user_id
       WHERE t.user_id = $1
       ORDER BY t.datum DESC, t.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET transactions error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/transactions
router.post('/', authMiddleware, async (req, res) => {
  const naziv = sanitize(req.body.naziv, 200);
  const kategorija = sanitize(req.body.kategorija, 100);
  const datum = sanitize(req.body.datum, 10);
  const iznos = parseFloat(req.body.iznos);

  if (!naziv) {
    return res.status(400).json({ error: 'Naziv je obavezan.' });
  }
  if (isNaN(iznos) || iznos <= 0) {
    return res.status(400).json({ error: 'Iznos mora biti pozitivan broj.' });
  }
  if (iznos > 9999999999) {
    return res.status(400).json({ error: 'Iznos je prevelik.' });
  }
  if (!kategorija) {
    return res.status(400).json({ error: 'Kategorija je obavezna.' });
  }
  if (!isValidDate(datum)) {
    return res.status(400).json({ error: 'Datum nije ispravan (format: YYYY-MM-DD).' });
  }

  try {
    const result = await query(
      'INSERT INTO transactions (user_id, naziv, iznos, kategorija, datum) VALUES ($1, $2, $3, $4, $5) RETURNING id, naziv, iznos, kategorija, datum, created_at',
      [req.userId, naziv, iznos, kategorija, datum]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST transaction error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Neispravan ID.' });
  }

  try {
    const result = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transakcija nije pronađena.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE transaction error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
