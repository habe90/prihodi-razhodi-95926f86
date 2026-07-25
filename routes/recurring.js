import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function sanitize(str, maxLen = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

// GET /api/recurring — sve ponavljajuće transakcije
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, naziv, iznos, kategorija, datum_pocetka, aktivan, created_at FROM recurring_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET recurring error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/recurring — dodaj novu
router.post('/', authMiddleware, async (req, res) => {
  const naziv = sanitize(req.body.naziv, 200);
  const kategorija = sanitize(req.body.kategorija, 100);
  const datumPocetka = sanitize(req.body.datum_pocetka, 10);
  const iznos = parseFloat(req.body.iznos);

  if (!naziv) return res.status(400).json({ error: 'Naziv je obavezan.' });
  if (isNaN(iznos) || iznos <= 0) return res.status(400).json({ error: 'Iznos mora biti pozitivan broj.' });
  if (!kategorija) return res.status(400).json({ error: 'Kategorija je obavezna.' });
  if (!datumPocetka || !datumPocetka.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Datum nije ispravan.' });
  }

  try {
    const result = await query(
      'INSERT INTO recurring_transactions (user_id, naziv, iznos, kategorija, datum_pocetka) VALUES ($1, $2, $3, $4, $5) RETURNING id, naziv, iznos, kategorija, datum_pocetka, aktivan, created_at',
      [req.userId, naziv, iznos, kategorija, datumPocetka]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST recurring error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// PUT /api/recurring/:id/toggle — uključi/isključi
router.put('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'UPDATE recurring_transactions SET aktivan = NOT aktivan WHERE id = $1 AND user_id = $2 RETURNING id, aktivan',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nije pronađeno.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT toggle error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// DELETE /api/recurring/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nije pronađeno.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE recurring error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/recurring/sync — sinhronizuj: kreiraj transactions za tekući mesec
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // uzmi sve aktivne recurring gde datum_pocetka nije u budućnosti
    const recurring = await query(
      `SELECT * FROM recurring_transactions
       WHERE user_id = $1 AND aktivan = true AND datum_pocetka <= $2::date`,
      [req.userId, today.toISOString().slice(0, 10)]
    );

    let created = 0;
    for (const r of recurring.rows) {
      const datum = `${currentMonth}-${r.datum_pocetka.slice(8, 10)}`;

      // proveri da li već postoji transakcija za ovaj mesec sa istim nazivom
      const exists = await query(
        `SELECT id FROM transactions
         WHERE user_id = $1 AND naziv = $2 AND TO_CHAR(datum, 'YYYY-MM') = $3`,
        [req.userId, r.naziv, currentMonth]
      );

      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO transactions (user_id, naziv, iznos, kategorija, datum) VALUES ($1, $2, $3, $4, $5)',
          [req.userId, r.naziv, r.iznos, r.kategorija, datum]
        );
        created++;
      }
    }

    res.json({ ok: true, created });
  } catch (err) {
    console.error('POST sync error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
