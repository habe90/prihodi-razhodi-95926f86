import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/summary — ukupni prihodi, rashodi, bilans + mesečni pregled
router.get('/', authMiddleware, async (req, res) => {
  try {
    const totals = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(c.type, 'rashod') = 'prihod' THEN t.iznos ELSE 0 END), 0) AS prihodi,
        COALESCE(SUM(CASE WHEN COALESCE(c.type, 'rashod') = 'rashod' THEN t.iznos ELSE 0 END), 0) AS rashodi
      FROM transactions t
      LEFT JOIN categories c ON c.name = t.kategorija AND c.user_id = t.user_id
      WHERE t.user_id = $1`,
      [req.userId]
    );

    const monthly = await query(
      `SELECT
        TO_CHAR(t.datum, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN COALESCE(c.type, 'rashod') = 'prihod' THEN t.iznos ELSE 0 END), 0) AS prihodi,
        COALESCE(SUM(CASE WHEN COALESCE(c.type, 'rashod') = 'rashod' THEN t.iznos ELSE 0 END), 0) AS rashodi
      FROM transactions t
      LEFT JOIN categories c ON c.name = t.kategorija AND c.user_id = t.user_id
      WHERE t.user_id = $1
      GROUP BY TO_CHAR(t.datum, 'YYYY-MM')
      ORDER BY month`,
      [req.userId]
    );

    const { prihodi, rashodi } = totals.rows[0];
    res.json({
      prihodi: parseFloat(prihodi),
      rashodi: parseFloat(rashodi),
      bilans: parseFloat(prihodi) - parseFloat(rashodi),
      monthly: monthly.rows.map(r => ({
        month: r.month,
        prihodi: parseFloat(r.prihodi),
        rashodi: parseFloat(r.rashodi),
        bilans: parseFloat(r.prihodi) - parseFloat(r.rashodi),
      })),
    });
  } catch (err) {
    console.error('GET summary error:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

export default router;
