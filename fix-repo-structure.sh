#!/bin/bash
# ============================================================
# fix-repo-structure.sh
# Run this from the ROOT of your cloned family_health repo
# Usage: bash fix-repo-structure.sh
# ============================================================

set -e
echo "🔧 Reorganizing family_health repo structure..."

# ── Create folder structure ──────────────────────────────────
mkdir -p backend/src/config
mkdir -p backend/src/middleware
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/src/utils
mkdir -p frontend/src
mkdir -p nginx
mkdir -p docs
mkdir -p logs

# ── Move files into correct locations ───────────────────────
echo "📁 Moving files..."

[ -f server.js ]         && mv server.js         backend/src/server.js
[ -f passport.js ]       && mv passport.js        backend/src/config/passport.js
[ -f auth.js ]           && mv auth.js            backend/src/middleware/auth.js
[ -f reports.js ]        && mv reports.js         backend/src/routes/reports.js
[ -f family.js ]         && mv family.js          backend/src/routes/family.js
[ -f metrics.js ]        && mv metrics.js         backend/src/routes/metrics.js
[ -f exercises.js ]      && mv exercises.js       backend/src/routes/exercises.js
[ -f insights.js ]       && mv insights.js        backend/src/routes/insights.js
[ -f faq.js ]            && mv faq.js             backend/src/routes/faq.js
[ -f ocrService.js ]     && mv ocrService.js      backend/src/services/ocrService.js
[ -f storageService.js ] && mv storageService.js  backend/src/services/storageService.js
[ -f insightService.js ] && mv insightService.js  backend/src/services/insightService.js
[ -f schema.sql ]        && mv schema.sql         backend/schema.sql
[ -f package.json ]      && mv package.json       backend/package.json
[ -f Dockerfile ]        && mv Dockerfile         backend/Dockerfile
[ -f nginx.conf ]        && mv nginx.conf         nginx/nginx.conf
[ -f API.md ]            && mv API.md             docs/API.md

# ── Create missing files ─────────────────────────────────────
echo "📝 Creating missing files..."

cat > backend/src/config/database.js << 'EOF'
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

pool.on('connect', (client) => {
  client.query("SET app.user_id = '00000000-0000-0000-0000-000000000000'");
});

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message });
});

async function query(text, params, userId = null) {
  const client = await pool.connect();
  try {
    if (userId) await client.query(`SET LOCAL app.user_id = '${userId}'`);
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function transaction(fn, userId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query(`SET LOCAL app.user_id = '${userId}'`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
EOF

cat > backend/src/middleware/errorHandler.js << 'EOF'
const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error('Server error', { error: err.message, url: req.url, method: req.method });
  }
  res.status(status).json({
    error: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
EOF

cat > backend/src/utils/logger.js << 'EOF'
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'family-health-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

module.exports = logger;
EOF

# ── Create .env.example ──────────────────────────────────────
cat > backend/.env.example << 'EOF'
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/family_health_db
DB_SSL=false
JWT_SECRET=replace-with-openssl-rand-hex-64
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=replace-with-openssl-rand-hex-64
JWT_REFRESH_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=family-health-reports-india
FILE_ENCRYPTION_KEY=replace-with-openssl-rand-hex-32
OPENAI_API_KEY=sk-your-openai-api-key
BCRYPT_ROUNDS=12
LOG_LEVEL=info
EOF

# ── Create .gitignore ────────────────────────────────────────
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
*/node_modules/

# Environment files - NEVER commit these
.env
backend/.env
frontend/.env.local
*.env.local

# Logs
logs/
*.log

# Build output
frontend/build/
frontend/dist/

# OS files
.DS_Store
Thumbs.db

# Temp files (uploaded reports before processing)
/tmp/
*.tmp

# SSL certificates - never commit
nginx/ssl/*.pem
nginx/ssl/*.key
EOF

# ── Create frontend placeholder ──────────────────────────────
mkdir -p frontend/public
cat > frontend/package.json << 'EOF'
{
  "name": "family-health-insights-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "recharts": "^2.10.0",
    "axios": "^1.6.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  }
}
EOF

# Copy the main React app
cat > frontend/README.md << 'EOF'
# Frontend

Place your React app files in `src/`.
The main App.jsx with full UI was generated separately — copy it here as `src/App.jsx`.

## Setup
```bash
npm install
REACT_APP_API_URL=http://localhost:5000/api/v1 npm start
```
EOF

# ── Create render.yaml for easy Render deployment ───────────
cat > render.yaml << 'EOF'
services:
  - type: web
    name: fhi-backend
    env: node
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: fhi-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true

databases:
  - name: fhi-db
    databaseName: family_health_db
    plan: free
EOF

# ── Commit everything ────────────────────────────────────────
echo "✅ Structure fixed. Committing..."
git add -A
git commit -m "fix: reorganize flat files into proper backend/src folder structure

- Move all JS files into backend/src/{config,middleware,routes,services,utils}
- Add missing database.js, errorHandler.js, logger.js
- Add .env.example, .gitignore, render.yaml
- Add frontend scaffold"

git push origin main

echo ""
echo "✅ Done! Your repo is now properly structured."
echo ""
echo "Next steps:"
echo "  1. cd backend && npm install"
echo "  2. cp .env.example .env && fill in your values"
echo "  3. createdb family_health_db && psql family_health_db < schema.sql"
echo "  4. npm run dev"

