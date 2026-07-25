import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/register
router.post('/register', async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Ime je obavezno.' });
  }
  if (!username || !username.trim() || username.trim().length < 3) {
    return res.status(400).json({ error: 'Korisničko ime mora imati bar 3 karaktera.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Lozinka mora imati bar 6 karaktera.' });
  }

  try {
    // provera da li username već postoji
    const existing = await query('SELECT id FROM users WHERE username = $1', [username.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Korisničko ime je već zauzeto.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name.trim(), username.trim().toLowerCase(), passwordHash]
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId);

    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), username: username.trim().toLowerCase() },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Unesite korisničko ime i lozinku.' });
  }

  try {
    const result = await query(
      'SELECT id, name, username, password_hash FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// GET /api/me — vrati trenutnog usera
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, name, username FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET me error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
