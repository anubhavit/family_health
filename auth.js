// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate access + refresh token pair
 */
function generateTokens(userId) {
  const jti = crypto.randomUUID(); // unique JWT ID for revocation

  const accessToken = jwt.sign(
    { sub: userId, jti, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', issuer: 'family-health-india' }
  );

  const refreshToken = jwt.sign(
    { sub: userId, jti, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d', issuer: 'family-health-india' }
  );

  return { accessToken, refreshToken, jti };
}

/**
 * Store session in DB for device tracking
 */
async function createSession(userId, jti, req) {
  const tokenHash = crypto.createHash('sha256').update(jti).digest('hex');
  const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      tokenHash,
      JSON.stringify({
        ua: req.headers['user-agent']?.slice(0, 200),
        platform: req.headers['sec-ch-ua-platform'] || 'unknown',
      }),
      ipHash,
      expiresAt,
    ]
  );
}

/**
 * Protect route — verify JWT + check session not revoked
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.slice(7);
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'family-health-india',
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check session not revoked
    const tokenHash = crypto.createHash('sha256').update(payload.jti).digest('hex');
    const { rows } = await query(
      `SELECT id FROM user_sessions
       WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash, payload.sub]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Session revoked or expired' });
    }

    // Fetch user
    const userResult = await query(
      'SELECT id, email, name, date_of_birth, profile_image FROM users WHERE id = $1 AND is_active = TRUE',
      [payload.sub]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    req.jti = payload.jti;
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Audit logging helper
 */
async function auditLog(userId, action, resourceType, resourceId, req, metadata = {}) {
  try {
    const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_hash, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resourceType, resourceId, ipHash, req.headers['user-agent']?.slice(0, 200), JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.error('Audit log failed', { error: err.message });
    // Non-fatal — don't throw
  }
}

module.exports = { generateTokens, createSession, requireAuth, auditLog };
