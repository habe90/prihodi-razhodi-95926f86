import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/transactions — sve transakcije za ulogovanog usera
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, naziv, iznos, kategorija, datum, created_at FROM transactions WHERE user_id = $1 ORDER BY datum DESC, created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET transactions error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/transactions — dodaj novu
router.post('/', authMiddleware, async (req, res) => {
  const { naziv, iznos, kategorija, datum } = req.body;

  if (!naziv || !naziv.trim()) {
    return res.status(400).json({ error: 'Naziv je obavezan.' });
  }
  const parsedIznos = parseFloat(iznos);
  if (isNaN(parsedIznos) || parsedIznos <= 0) {
    return res.status(400).json({ error: 'Iznos mora biti pozitivan broj.' });
  }
  if (!['prihod', 'rashod'].includes(kategorija)) {
    return res.status(400).json({ error: 'Kategorija mora biti prihod ili rashod.' });
  }
  if (!datum) {
    return res.status(400).json({ error: 'Datum je obavezan.' });
  }

  try {
    const result = await query(
      'INSERT INTO transactions (user_id, naziv, iznos, kategorija, datum) VALUES ($1, $2, $3, $4, $5) RETURNING id, naziv, iznos, kategorija, datum, created_at',
      [req.userId, naziv.trim(), parsedIznos, kategorija, datum]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST transaction error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// DELETE /api/transactions/:id — obriši transakciju
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
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
