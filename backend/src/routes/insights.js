// src/routes/insights.js
const express = require('express');
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /insights?memberId=xxx
router.get('/', async (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });

  try {
    const check = await query(
      'SELECT id FROM family_members WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
      [memberId, req.user.id]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await query(
      `SELECT i.*, r.lab_name, r.report_date
       FROM health_insights i
       JOIN reports r ON r.id = i.report_id
       WHERE i.member_id = $1
       ORDER BY i.created_at DESC, i.severity DESC
       LIMIT 20`,
      [memberId]
    );

    res.json({ insights: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

module.exports = router;
