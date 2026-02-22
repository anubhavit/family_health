// src/routes/exercises.js
const express = require('express');
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ─── GET /exercises — all conditions + exercises ──────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT hc.id, hc.code, hc.name, hc.description, hc.icon,
         json_agg(
           json_build_object(
             'id', e.id,
             'name', e.name,
             'difficulty', e.difficulty,
             'duration_minutes', e.duration_minutes,
             'target_muscles', e.target_muscles,
             'indian_lifestyle_note', e.indian_lifestyle_note,
             'youtube_url', e.youtube_url,
             'calories_estimate', e.calories_estimate
           ) ORDER BY e.sort_order
         ) AS exercises
       FROM health_conditions hc
       LEFT JOIN exercises e ON e.condition_id = hc.id AND e.is_active = TRUE
       WHERE hc.is_active = TRUE
       GROUP BY hc.id
       ORDER BY hc.code`
    );
    res.json({ conditions: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// ─── GET /exercises/recommended?memberId=xxx ──────────────────
router.get('/recommended', async (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });

  try {
    // Get member's conditions from AI analysis
    const { rows: conditions } = await query(
      `SELECT hc.code, hc.name, hc.icon, mc.confidence
       FROM member_conditions mc
       JOIN health_conditions hc ON hc.id = mc.condition_id
       WHERE mc.member_id = $1 AND mc.is_active = TRUE AND mc.member_id IN (
         SELECT id FROM family_members WHERE user_id = $2
       )
       ORDER BY mc.confidence DESC`,
      [memberId, req.user.id]
    );

    // Fallback: get top exercises for heart health if no conditions
    const conditionCodes = conditions.length > 0
      ? conditions.slice(0, 2).map(c => c.code)
      : ['heart_health'];

    const { rows: exercises } = await query(
      `SELECT e.*, hc.name AS condition_name, hc.icon AS condition_icon
       FROM exercises e
       JOIN health_conditions hc ON hc.id = e.condition_id
       WHERE hc.code = ANY($1) AND e.is_active = TRUE
       ORDER BY e.sort_order ASC
       LIMIT 6`,
      [conditionCodes]
    );

    res.json({
      conditions,
      exercises,
      isPersonalized: conditions.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────
// src/routes/insights.js
