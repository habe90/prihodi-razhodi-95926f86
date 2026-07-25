import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/profile — podaci o korisniku
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, username, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET profile error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// PUT /api/profile/password — promena lozinke
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Unesite staru i novu lozinku.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova lozinka mora imati bar 6 karaktera.' });
  }
  if (newPassword.length > 128) {
    return res.status(400).json({ error: 'Nova lozinka je preduga.' });
  }

  try {
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Stara lozinka nije ispravna.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);

    res.json({ ok: true, message: 'Lozinka je uspešno promenjena.' });
  } catch (err) {
    console.error('PUT password error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
