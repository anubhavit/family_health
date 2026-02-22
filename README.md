# 🏥 Family Health Insights India

> Preventive health tracking for Indian families — track lab reports, get AI health insights, personalized exercise & diet plans.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL%20%7C%20GPT--4-1B4332)
![Target](https://img.shields.io/badge/Users-Indian%20families%20under%2050-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 👨‍👩‍👧‍👦 Family Profiles | Up to 10 members, dietary preferences (veg/jain/vegan/non-veg) |
| 📋 Report Upload | PDF/image reports from Thyrocare, Dr Lal, Metropolis, generic |
| 🤖 OCR + AI | Tesseract + GPT-4-Vision extracts all lab values automatically |
| 📈 Trend Charts | Track any metric across reports — improving/stable/worsening |
| 💡 Health Insights | Personalized, Indian-context preventive health tips |
| 🏃 Exercise Module | 8 conditions × 12 exercises, YouTube links, difficulty levels |
| 🥗 Diet & Lifestyle | Dietary-preference-aware Indian food recommendations |
| 🔒 Security | AES-256 file encryption, JWT sessions, RLS, audit logs |

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- An OpenAI API key
- AWS S3 (or Cloudflare R2) bucket

### 1. Clone & Setup

```bash
git clone https://github.com/yourorg/family-health-insights-india.git
cd family-health-insights-india
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and fill in environment variables
cp .env.example .env
nano .env   # Fill in required values (see section below)
```

### 3. Database Setup

```bash
# Create database
createdb family_health_db

# Run schema (creates all tables, seeds exercises)
psql family_health_db < schema.sql

# Or with connection string:
psql $DATABASE_URL < schema.sql
```

### 4. Start Backend

```bash
npm run dev
# Server starts at http://localhost:5000
# Test: curl http://localhost:5000/health
```

### 5. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env.local

# Fill in:
# REACT_APP_API_URL=http://localhost:5000/api/v1
# REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id

npm start
# App opens at http://localhost:3000
```

---

## 🔑 Required Environment Variables

### Critical (app won't start without these)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/family_health_db

# JWT (generate with: openssl rand -hex 64)
JWT_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<64-char-random-hex>

# OpenAI (for OCR + insights)
OPENAI_API_KEY=sk-...

# AWS S3 for encrypted file storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=family-health-reports-india
AWS_REGION=ap-south-1

# File encryption (generate with: openssl rand -hex 32)
FILE_ENCRYPTION_KEY=<32-byte-hex>
```

### Optional (Google OAuth)

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
```

---

## 🐳 Docker Deployment

### Development

```bash
cp .env.example .env
# Fill in all required values

docker compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Database: localhost:5432
```

### Production (with SSL)

```bash
# 1. Get SSL certificate
certbot certonly --webroot -w /var/www/certbot \
  -d familyhealthinsights.in -d www.familyhealthinsights.in

# 2. Copy certs
cp /etc/letsencrypt/live/familyhealthinsights.in/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/familyhealthinsights.in/privkey.pem nginx/ssl/

# 3. Set production env
export NODE_ENV=production
export FRONTEND_URL=https://familyhealthinsights.in
# ... other env vars

# 4. Deploy
docker compose up -d --build

# 5. Verify
curl https://familyhealthinsights.in/health
```

---

## ☁️ Cloud Deployment Options

### Option A: Railway (Recommended — simplest)

```bash
npm install -g @railway/cli
railway login
railway new family-health-insights

# Deploy backend
cd backend
railway up

# Add PostgreSQL plugin in Railway dashboard
# Set environment variables in Railway dashboard

# Deploy frontend to Vercel
cd ../frontend
vercel deploy --prod
```

### Option B: AWS (Production-grade)

```
Architecture:
- EC2 t3.medium (backend)
- RDS PostgreSQL t3.micro (database)
- S3 (file storage) + KMS (encryption)
- CloudFront (CDN for frontend)
- ALB (load balancer)
- Route 53 (DNS)
- ACM (SSL certificates)

Cost estimate: ~$80-120/month for 1000 users
```

### Option C: Supabase (Zero-infra)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init
supabase db push < schema.sql

# Use Supabase storage instead of S3
# Update DATABASE_URL to Supabase connection string
# Enable RLS in Supabase dashboard (already in schema)
```

### Option D: Render

```yaml
# render.yaml
services:
  - type: web
    name: fhi-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: fhi-db
          property: connectionString
  
  - type: static
    name: fhi-frontend
    buildCommand: npm run build
    staticPublishPath: ./build

databases:
  - name: fhi-db
    databaseName: family_health_db
    plan: free
```

---

## 📁 Project Structure

```
family-health-insights-india/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js        # PostgreSQL pool + RLS
│   │   │   └── passport.js        # Google OAuth + Local strategy
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT + session management
│   │   │   └── errorHandler.js    # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js            # Login, signup, Google OAuth
│   │   │   ├── family.js          # Family member CRUD
│   │   │   ├── reports.js         # Report upload + OCR trigger
│   │   │   ├── metrics.js         # Trends + summary
│   │   │   ├── exercises.js       # Exercise library + recommendations
│   │   │   ├── insights.js        # AI health insights
│   │   │   └── faq.js             # FAQ topics
│   │   ├── services/
│   │   │   ├── ocrService.js      # Tesseract + GPT-4 pipeline
│   │   │   ├── storageService.js  # S3 + AES-256 encryption
│   │   │   └── insightService.js  # AI insight generation
│   │   └── utils/
│   │       └── logger.js          # Winston logging
│   ├── schema.sql                 # Full DB schema + seed data
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app (full MVP UI)
│   │   ├── api/                   # Axios API client
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf                 # Reverse proxy + SSL + rate limits
├── docs/
│   └── API.md                     # Full API reference
├── docker-compose.yml
└── README.md
```

---

## 🔒 Security Architecture

```
User Device
    │  HTTPS (TLS 1.3)
    ▼
Nginx (Rate limiting, CSP, HSTS)
    │
    ├── /api/* → Node.js Express
    │              ├── JWT validation (per request)
    │              ├── Session DB check (revocation)
    │              ├── PostgreSQL RLS (row-level security)
    │              └── Audit logging
    │
    └── / → React SPA (static)

File Storage:
    Report → AES-256-CBC encrypt (client-side) → S3 upload → S3 SSE-AES256
    Download → Presigned URL (15min) → Decrypt on-the-fly
```

**Security features checklist:**
- [x] AES-256-CBC file encryption before S3 upload
- [x] S3 server-side encryption (SSE-AES256)
- [x] No public S3 bucket access (presigned URLs only)
- [x] JWT with jti tracking (revocable sessions)
- [x] PostgreSQL Row Level Security
- [x] IP stored as SHA-256 hash (GDPR-friendly)
- [x] Audit log for all write operations
- [x] Helmet.js security headers
- [x] CORS strict origin whitelist
- [x] Rate limiting (global + per-endpoint)
- [x] bcrypt password hashing (12 rounds)
- [x] Input validation on all endpoints
- [x] SQL parameterized queries (no injection)
- [x] Non-root Docker user

---

## 🤖 OCR + AI Pipeline

```
Upload PDF/Image
      │
      ▼
Multer (temp storage)
      │
      ├── PDF → pdf-parse (text extraction)
      │         └── if scanned → Tesseract OCR
      │
      └── Image → Tesseract OCR (eng+hin)
                  └── Low quality → GPT-4-Vision
      │
      ▼
Lab Detection (Thyrocare/DrLal/Metropolis/Generic)
      │
      ▼
GPT-4 Structured Extraction
  {test_name, value, unit, ref_range, status}
      │
      ▼
Status Computation (normal/low/high/critical)
      │
      ▼
Store in PostgreSQL metrics table
      │
      ▼
Generate AI Health Insights
      │
      ▼
Update member_conditions (for exercise personalization)
      │
      ▼
Cleanup temp file
```

**Supported tests auto-extracted:**
CBC, Lipid Profile, LFT, KFT, Thyroid, Diabetes markers, Vitamins D/B12, Iron profile, Hormones

---

## 📱 India-Specific Features

- **Lab support:** Thyrocare, Dr Lal PathLabs, Metropolis, SRL, Apollo, Generic
- **Dietary preferences:** Veg, Non-veg, Eggetarian, Jain, Vegan
- **Food recommendations:** Dal, rajma, methi, amla, ragi, jowar, bajra
- **Exercise context:** Colony walking, terrace exercises, yoga, Surya Namaskar
- **Medical tests:** Standard Indian panel names (CBC, Lipid Profile, LFT, KFT)
- **Currency/units:** Indian standard reference ranges

---

## 📊 Database Schema Overview

| Table | Records | Purpose |
|-------|---------|---------|
| `users` | Per account | Auth + age validation |
| `user_sessions` | Per login | JWT revocation + device tracking |
| `audit_logs` | Per action | Security audit trail |
| `family_members` | Max 10/user | Health profiles |
| `reports` | Per upload | Report metadata + OCR status |
| `metrics` | ~10-20/report | Extracted lab values |
| `health_conditions` | 8 (seeded) | Condition definitions |
| `exercises` | 40+ (seeded) | Exercise library |
| `health_insights` | Per report | AI-generated tips |
| `member_conditions` | Per diagnosis | Member-condition mapping |
| `faq_topics` | Static | Educational content |

---

## ⚠️ Disclaimer

This application is for **educational and preventive health tracking purposes only**. It is:
- ❌ NOT a medical diagnosis tool
- ❌ NOT a substitute for professional medical advice
- ❌ NOT intended for medical emergencies (call 108)
- ✅ For tracking and understanding personal health trends
- ✅ For lifestyle and preventive health awareness

AI-powered features may make errors. Always consult a qualified doctor for medical decisions.

---

## 📄 License

MIT — built for Indian families 🇮🇳
