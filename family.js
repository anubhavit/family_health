// src/routes/family.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { requireAuth, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

const VALID_DIETS = ['veg', 'non-veg', 'eggetarian', 'jain', 'vegan'];
const VALID_GENDERS = ['male', 'female', 'other'];
const VALID_RELATIONSHIPS = ['self', 'spouse', 'son', 'daughter', 'father', 'mother', 'sibling', 'other'];

const memberValidators = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('date_of_birth').isISO8601(),
  body('gender').isIn(VALID_GENDERS),
  body('relationship').isIn(VALID_RELATIONSHIPS),
  body('dietary_pref').isIn(VALID_DIETS),
  body('notes').optional().isLength({ max: 500 }),
];

// ─── GET /family ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        fm.*,
        COUNT(DISTINCT r.id) AS report_count,
        MAX(r.report_date) AS last_report_date
       FROM family_members fm
       LEFT JOIN reports r ON r.member_id = fm.id AND r.ocr_status = 'completed'
       WHERE fm.user_id = $1 AND fm.is_active = TRUE
       GROUP BY fm.id
       ORDER BY
         CASE fm.relationship WHEN 'self' THEN 0 ELSE 1 END,
         fm.created_at ASC`,
      [req.user.id]
    );

    res.json({ members: rows });
  } catch (err) {
    logger.error('Get family error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// ─── GET /family/:id ─────────────────────────────────────────
router.get('/:id', param('id').isUUID(), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT fm.*,
        (SELECT COUNT(*) FROM reports r WHERE r.member_id = fm.id AND r.ocr_status = 'completed') AS report_count,
        (SELECT json_agg(mc.*) FROM member_conditions mc JOIN health_conditions hc ON hc.id = mc.condition_id WHERE mc.member_id = fm.id AND mc.is_active = TRUE) AS conditions
       FROM family_members fm
       WHERE fm.id = $1 AND fm.user_id = $2 AND fm.is_active = TRUE`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// ─── POST /family ─────────────────────────────────────────────
router.post('/', memberValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, date_of_birth, gender, relationship, dietary_pref, notes } = req.body;

  // Validate age
  const age = Math.floor((Date.now() - new Date(date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
  if (age > 120 || age < 0) return res.status(422).json({ error: 'Invalid date of birth' });

  try {
    // Max 10 family members per user
    const count = await query(
      'SELECT COUNT(*) FROM family_members WHERE user_id = $1 AND is_active = TRUE',
      [req.user.id]
    );
    if (parseInt(count.rows[0].count) >= 10) {
      return res.status(400).json({ error: 'Maximum 10 family members allowed' });
    }

    const { rows } = await query(
      `INSERT INTO family_members (user_id, name, date_of_birth, gender, relationship, dietary_pref, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name.trim(), date_of_birth, gender, relationship, dietary_pref, notes || null]
    );

    auditLog(req.user.id, 'CREATE_MEMBER', 'family_member', rows[0].id, req);
    res.status(201).json({ member: rows[0] });
  } catch (err) {
    logger.error('Create member error', { error: err.message });
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// ─── PUT /family/:id ─────────────────────────────────────────
router.put('/:id', param('id').isUUID(), memberValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, date_of_birth, gender, relationship, dietary_pref, notes } = req.body;

  try {
    const { rows } = await query(
      `UPDATE family_members
       SET name=$1, date_of_birth=$2, gender=$3, relationship=$4, dietary_pref=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 AND user_id=$8 AND is_active=TRUE
       RETURNING *`,
      [name.trim(), date_of_birth, gender, relationship, dietary_pref, notes || null, req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    auditLog(req.user.id, 'UPDATE_MEMBER', 'family_member', rows[0].id, req);
    res.json({ member: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// ─── DELETE /family/:id ───────────────────────────────────────
router.delete('/:id', param('id').isUUID(), async (req, res) => {
  try {
    // Soft delete
    const { rows } = await query(
      `UPDATE family_members SET is_active=FALSE, updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND relationship != 'self' AND is_active=TRUE RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Member not found or cannot delete self' });
    }

    auditLog(req.user.id, 'DELETE_MEMBER', 'family_member', rows[0].id, req);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
