import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/categories — sve kategorije za ulogovanog usera
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, type, created_at FROM categories WHERE user_id = $1 ORDER BY type, name',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET categories error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/categories — dodaj novu
router.post('/', authMiddleware, async (req, res) => {
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Naziv kategorije je obavezan.' });
  }
  if (!['prihod', 'rashod'].includes(type)) {
    return res.status(400).json({ error: 'Tip mora biti prihod ili rashod.' });
  }

  try {
    const result = await query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id, name, type, created_at',
      [req.userId, name.trim(), type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Kategorija sa ovim nazivom već postoji.' });
    }
    console.error('POST category error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategorija nije pronađena.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE category error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
