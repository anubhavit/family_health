// src/routes/metrics.js
const express = require('express');
const { param, query: queryValidator } = require('express-validator');
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ─── GET /metrics/trends?memberId=xxx&testName=xxx ────────────
router.get('/trends', async (req, res) => {
  const { memberId, testName } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });

  try {
    // Verify member ownership
    const check = await query(
      'SELECT id FROM family_members WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
      [memberId, req.user.id]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'Access denied' });

    let sql, params;

    if (testName) {
      // Single metric trend
      sql = `SELECT
               test_name, unit, report_date, value, status, deviation_pct,
               LAG(value) OVER (ORDER BY report_date) AS prev_value,
               ROUND(
                 (value - LAG(value) OVER (ORDER BY report_date)) /
                 NULLIF(LAG(value) OVER (ORDER BY report_date), 0) * 100, 2
               ) AS change_pct
             FROM metrics
             WHERE member_id=$1 AND test_name ILIKE $2
             ORDER BY report_date ASC`;
      params = [memberId, `%${testName}%`];
    } else {
      // All metrics with at least 2 data points
      sql = `SELECT
               test_name, test_category, unit,
               COUNT(*) AS data_points,
               json_agg(json_build_object(
                 'date', report_date,
                 'value', value,
                 'status', status
               ) ORDER BY report_date ASC) AS history,
               FIRST_VALUE(value) OVER (PARTITION BY test_name ORDER BY report_date DESC) AS latest_value,
               FIRST_VALUE(status) OVER (PARTITION BY test_name ORDER BY report_date DESC) AS latest_status
             FROM metrics
             WHERE member_id=$1
             GROUP BY test_name, test_category, unit
             HAVING COUNT(*) >= 2
             ORDER BY test_category, test_name`;
      params = [memberId];
    }

    const { rows } = await query(sql, params);

    // Compute trend direction
    const withTrend = rows.map(row => {
      if (row.history && row.history.length >= 2) {
        const first = row.history[0].value;
        const last = row.history[row.history.length - 1].value;
        const changePct = ((last - first) / first * 100).toFixed(1);
        const lowerIsBetter = !['Hemoglobin', 'HDL Cholesterol', 'Vitamin D', 'Vitamin B12'].includes(row.test_name);
        const improving = lowerIsBetter ? last < first : last > first;

        return {
          ...row,
          trend: improving ? 'improving' : Math.abs(changePct) < 2 ? 'stable' : 'worsening',
          change_pct: parseFloat(changePct),
        };
      }
      return { ...row, trend: 'stable' };
    });

    res.json({ trends: withTrend });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// ─── GET /metrics/summary?memberId=xxx ───────────────────────
router.get('/summary', async (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });

  try {
    const check = await query(
      'SELECT id FROM family_members WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
      [memberId, req.user.id]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'Access denied' });

    // Latest values for each test
    const { rows } = await query(
      `SELECT DISTINCT ON (test_name)
         test_name, test_category, value, unit, status, ref_range_text, report_date, deviation_pct
       FROM metrics
       WHERE member_id = $1
       ORDER BY test_name, report_date DESC`,
      [memberId]
    );

    const summary = {
      total: rows.length,
      high: rows.filter(r => r.status === 'high' || r.status === 'critical_high').length,
      low: rows.filter(r => r.status === 'low' || r.status === 'critical_low').length,
      normal: rows.filter(r => r.status === 'normal').length,
      critical: rows.filter(r => r.status === 'critical_high' || r.status === 'critical_low').length,
      byCategory: rows.reduce((acc, r) => {
        if (!acc[r.test_category]) acc[r.test_category] = [];
        acc[r.test_category].push(r);
        return acc;
      }, {}),
      latestMetrics: rows,
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
