// src/routes/reports.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { param, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { requireAuth, auditLog } = require('../middleware/auth');
const { uploadReport, getDownloadUrl, downloadAndDecrypt, deleteFile, computeFileHash } = require('../services/storageService');
const { processReport } = require('../services/ocrService');
const { generateInsights } = require('../services/insightService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

// ─── MULTER CONFIG ────────────────────────────────────────────
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, PNG, and WebP files are allowed'));
  },
});

// ─── GET /reports?memberId=xxx ────────────────────────────────
router.get('/', async (req, res) => {
  const memberId = req.query.memberId;

  try {
    let sql, params;

    if (memberId) {
      // Verify member belongs to user
      const memberCheck = await query(
        'SELECT id FROM family_members WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
        [memberId, req.user.id]
      );
      if (!memberCheck.rows.length) {
        return res.status(404).json({ error: 'Member not found' });
      }

      sql = `SELECT r.*,
               (SELECT json_agg(m.* ORDER BY m.test_name)
                FROM metrics m WHERE m.report_id = r.id) AS metrics
             FROM reports r
             WHERE r.member_id = $1 AND r.user_id = $2
             ORDER BY r.report_date DESC`;
      params = [memberId, req.user.id];
    } else {
      sql = `SELECT r.*, fm.name AS member_name, fm.relationship
             FROM reports r
             JOIN family_members fm ON fm.id = r.member_id
             WHERE r.user_id = $1
             ORDER BY r.report_date DESC
             LIMIT 50`;
      params = [req.user.id];
    }

    const { rows } = await query(sql, params);
    res.json({ reports: rows });
  } catch (err) {
    logger.error('Get reports error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ─── GET /reports/:id ─────────────────────────────────────────
router.get('/:id', param('id').isUUID(), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*,
         (SELECT json_agg(m.* ORDER BY m.test_category, m.test_name) FROM metrics m WHERE m.report_id = r.id) AS metrics,
         (SELECT json_agg(i.* ORDER BY i.severity DESC) FROM health_insights i WHERE i.report_id = r.id) AS insights
       FROM reports r
       WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Report not found' });

    // Attach presigned download URL (15 min expiry)
    const report = rows[0];
    try {
      report.download_url = await getDownloadUrl(report.file_key);
    } catch (_) {
      report.download_url = null; // Non-fatal
    }

    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ─── POST /reports/upload ─────────────────────────────────────
router.post('/upload', upload.single('report'), async (req, res) => {
  const tempPath = req.file?.path;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { memberId, labName, reportDate, reportType } = req.body;

    if (!memberId) return res.status(400).json({ error: 'memberId is required' });
    if (!reportDate) return res.status(400).json({ error: 'reportDate is required' });

    // Verify member ownership
    const memberCheck = await query(
      'SELECT id FROM family_members WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
      [memberId, req.user.id]
    );
    if (!memberCheck.rows.length) {
      return res.status(403).json({ error: 'Member not found or access denied' });
    }

    // Upload to S3 with encryption
    const { fileKey, fileHash, fileSizeBytes } = await uploadReport(
      tempPath,
      req.user.id,
      memberId,
      req.file.originalname,
      req.file.mimetype
    );

    // Create report record
    const { rows: reportRows } = await query(
      `INSERT INTO reports (user_id, member_id, lab_name, report_type, report_date, file_key, file_hash, file_size_bytes, mime_type, ocr_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
      [
        req.user.id, memberId,
        labName || 'Unknown Lab',
        reportType || 'General',
        reportDate, fileKey, fileHash, fileSizeBytes,
        req.file.mimetype,
      ]
    );

    const reportId = reportRows[0].id;
    auditLog(req.user.id, 'UPLOAD_REPORT', 'report', reportId, req);

    // Return immediately, process asynchronously
    res.status(202).json({
      message: 'Report uploaded. Processing started.',
      reportId,
      status: 'pending',
    });

    // ─ ASYNC PROCESSING ──────────────────────────────────────
    processReportAsync(reportId, tempPath, req.file.mimetype, req.user.id, memberId, reportDate)
      .catch(err => logger.error('Async report processing failed', { reportId, error: err.message }));

  } catch (err) {
    logger.error('Report upload error', { error: err.message });
    // Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

// ─── BACKGROUND PROCESSING ────────────────────────────────────
async function processReportAsync(reportId, tempPath, mimeType, userId, memberId, reportDate) {
  try {
    await query("UPDATE reports SET ocr_status='processing' WHERE id=$1", [reportId]);

    const result = await processReport(tempPath, mimeType);

    if (!result.success) {
      await query(
        "UPDATE reports SET ocr_status='failed', updated_at=NOW() WHERE id=$1",
        [reportId]
      );
      return;
    }

    // Store extracted metrics
    await transaction(async (client) => {
      await client.query(
        `UPDATE reports
         SET ocr_status='completed', ocr_raw_text=$1, ocr_confidence=$2,
             ai_model_used=$3, processing_ms=$4, lab_name=COALESCE(NULLIF($5,''), lab_name), updated_at=NOW()
         WHERE id=$6`,
        [
          result.rawText?.slice(0, 50000),
          result.ocrConfidence,
          result.model,
          result.processingMs,
          result.labName,
          reportId,
        ]
      );

      // Insert metrics
      for (const m of result.metrics) {
        await client.query(
          `INSERT INTO metrics (report_id, member_id, user_id, test_name, test_category, value, unit,
             ref_range_low, ref_range_high, ref_range_text, status, deviation_pct, report_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT DO NOTHING`,
          [
            reportId, memberId, userId,
            m.test_name, m.test_category,
            m.value, m.unit,
            m.ref_range_low, m.ref_range_high, m.ref_range_text,
            m.status, m.deviation_pct, reportDate,
          ]
        );
      }
    }, userId);

    // Generate AI health insights
    await generateInsights(reportId, memberId, userId, result.metrics);

    logger.info('Report processing complete', { reportId });
  } catch (err) {
    logger.error('Processing error', { reportId, error: err.message });
    await query("UPDATE reports SET ocr_status='failed' WHERE id=$1", [reportId]);
  } finally {
    // Clean up temp file
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  }
}

// ─── GET /reports/:id/status ──────────────────────────────────
router.get('/:id/status', param('id').isUUID(), async (req, res) => {
  const { rows } = await query(
    'SELECT id, ocr_status, processing_ms, created_at, updated_at FROM reports WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Report not found' });
  res.json(rows[0]);
});

// ─── DELETE /reports/:id ──────────────────────────────────────
router.delete('/:id', param('id').isUUID(), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT file_key FROM reports WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Report not found' });

    // Delete metrics and insights first (cascade)
    await transaction(async (client) => {
      await client.query('DELETE FROM health_insights WHERE report_id=$1', [req.params.id]);
      await client.query('DELETE FROM metrics WHERE report_id=$1', [req.params.id]);
      await client.query('DELETE FROM reports WHERE id=$1', [req.params.id]);
    }, req.user.id);

    // Delete from S3
    await deleteFile(rows[0].file_key).catch(() => {});

    auditLog(req.user.id, 'DELETE_REPORT', 'report', req.params.id, req);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
