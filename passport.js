// src/config/passport.js
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const { query } = require('./database');
const logger = require('../utils/logger');

// ─── LOCAL STRATEGY ───────────────────────────────────────────
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const { rows } = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email.toLowerCase().trim()]
      );

      if (!rows.length) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const user = rows[0];

      if (!user.password_hash) {
        return done(null, false, { message: 'Please sign in with Google' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (err) {
      logger.error('Local strategy error', { error: err.message });
      return done(err);
    }
  }
));

// ─── GOOGLE STRATEGY ──────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.birthday.read'],
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const name = profile.displayName;
      const avatar = profile.photos?.[0]?.value;

      if (!email) {
        return done(null, false, { message: 'No email from Google' });
      }

      // Check if user exists by Google ID or email
      const existing = await query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [googleId, email]
      );

      if (existing.rows.length) {
        const user = existing.rows[0];
        // Update google_id if signing in via Google for the first time
        if (!user.google_id) {
          await query(
            'UPDATE users SET google_id = $1, profile_image = $2, updated_at = NOW() WHERE id = $3',
            [googleId, avatar, user.id]
          );
        }
        return done(null, user);
      }

      // New user — extract birthday if available
      const birthday = profile._json?.birthdays?.[0]?.date;
      const dob = birthday
        ? `${birthday.year}-${String(birthday.month).padStart(2,'0')}-${String(birthday.day).padStart(2,'0')}`
        : null;

      // Age check — must be under 50
      if (dob) {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age >= 50) {
          return done(null, false, { message: 'This app is for users under 50 years old' });
        }
      }

      // Create new user
      const { rows } = await query(
        `INSERT INTO users (email, google_id, name, date_of_birth, profile_image, is_verified, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
         RETURNING *`,
        [email, googleId, name, dob || '1990-01-01', avatar]
      );

      return done(null, rows[0]);
    } catch (err) {
      logger.error('Google strategy error', { error: err.message });
      return done(err);
    }
  }
));
