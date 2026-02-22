const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { generateTokens, createSession, requireAuth, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const signupValidators = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('date_of_birth').isISO8601().custom((dob) => {
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age >= 50) throw new Error('This app is for users under 50 years old');
    if (age < 13) throw new Error('Must be at least 13 years old');
    return true;
  }),
];

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    dateOfBirth: user.date_of_birth,
    age: user.age,
    profileImage: user.profile_image,
  };
}

function respondWithTokens(res, user, req, message = 'Success') {
  const { accessToken, refreshToken, jti } = generateTokens(user.id);
  createSession(user.id, jti, req).catch(() => {});
  auditLog(user.id, 'LOGIN', 'user', user.id, req);
  query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});
  return res.json({ message, user: formatUser(user), tokens: { accessToken, refreshToken } });
}

// POST /signup
router.post('/signup', signupValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, email, password, date_of_birth } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    const { rows } = await query(
      'INSERT INTO users (name, email, password_hash, date_of_birth) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), email, passwordHash, date_of_birth]
    );

    await query(
      "INSERT INTO family_members (user_id, name, date_of_birth, gender, relationship, dietary_pref) VALUES ($1, $2, $3, 'other', 'self', 'veg')",
      [rows[0].id, name.trim(), date_of_birth]
    );

    return respondWithTokens(res, rows[0], req, 'Account created successfully');
  } catch (err) {
    logger.error('Signup error', { error: err.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /login
router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    return respondWithTokens(res, user, req, 'Logged in successfully');
  })(req, res, next);
});

// GET /google
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

// GET /google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
  }),
  (req, res) => {
    const { accessToken, refreshToken, jti } = generateTokens(req.user.id);
    createSession(req.user.id, jti, req).catch(() => {});
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('at', accessToken);
    redirectUrl.searchParams.set('rt', refreshToken);
    res.redirect(redirectUrl.toString());
  }
);

// POST /refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { issuer: 'family-health-india' });
    if (payload.type !== 'refresh') throw new Error('Wrong token type');
    const { rows } = await query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    return respondWithTokens(res, rows[0], req, 'Token refreshed');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(req.jti).digest('hex');
    await query('UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: formatUser(req.user) });
});

module.exports = router;
