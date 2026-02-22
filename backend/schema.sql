-- ============================================================
-- FAMILY HEALTH INSIGHTS INDIA — PostgreSQL Schema
-- Version: 1.0.0
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search on metric names

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT,                          -- null for Google-only accounts
    google_id       VARCHAR(255) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    date_of_birth   DATE NOT NULL,
    age             INTEGER GENERATED ALWAYS AS (
                        EXTRACT(YEAR FROM age(date_of_birth))::INTEGER
                    ) STORED,
    profile_image   TEXT,                          -- URL to encrypted cloud storage
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,

    CONSTRAINT chk_age_under_50 CHECK (
        EXTRACT(YEAR FROM age(date_of_birth)) < 50
    )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- ────────────────────────────────────────────────────────────
-- SESSIONS / AUDIT
-- ────────────────────────────────────────────────────────────
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,                 -- SHA-256 of JWT jti
    device_info     JSONB DEFAULT '{}',            -- UA, IP (hashed), OS
    ip_hash         TEXT,                          -- SHA-256 of IP for audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    is_active       BOOLEAN GENERATED ALWAYS AS (
                        revoked_at IS NULL AND expires_at > NOW()
                    ) STORED
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,         -- e.g. LOGIN, UPLOAD_REPORT
    resource_type   VARCHAR(100),
    resource_id     UUID,
    ip_hash         TEXT,
    user_agent      TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ────────────────────────────────────────────────────────────
-- FAMILY MEMBERS
-- ────────────────────────────────────────────────────────────
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE diet_type AS ENUM ('veg', 'non-veg', 'eggetarian', 'jain', 'vegan');
CREATE TYPE relationship_type AS ENUM (
    'self', 'spouse', 'son', 'daughter',
    'father', 'mother', 'sibling', 'other'
);
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high');

CREATE TABLE family_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    date_of_birth   DATE NOT NULL,
    age             INTEGER GENERATED ALWAYS AS (
                        EXTRACT(YEAR FROM age(date_of_birth))::INTEGER
                    ) STORED,
    gender          gender_type NOT NULL,
    relationship    relationship_type NOT NULL,
    dietary_pref    diet_type NOT NULL DEFAULT 'veg',
    risk_level      risk_level DEFAULT 'low',
    avatar_url      TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_user_id ON family_members(user_id);

-- ────────────────────────────────────────────────────────────
-- REPORTS
-- ────────────────────────────────────────────────────────────
CREATE TYPE report_status AS ENUM (
    'pending', 'processing', 'completed', 'failed'
);

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    lab_name        VARCHAR(255) NOT NULL,
    report_type     VARCHAR(255) NOT NULL,         -- CBC, Lipid Profile, etc.
    report_date     DATE NOT NULL,
    file_key        TEXT NOT NULL,                 -- encrypted S3/GCS key
    file_hash       TEXT NOT NULL,                 -- SHA-256 for integrity
    file_size_bytes INTEGER,
    mime_type       VARCHAR(100) DEFAULT 'application/pdf',
    ocr_status      report_status DEFAULT 'pending',
    ocr_raw_text    TEXT,                          -- extracted OCR text
    ocr_confidence  FLOAT,                         -- 0–1 confidence score
    ai_model_used   VARCHAR(100),
    processing_ms   INTEGER,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_member_id ON reports(member_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_date ON reports(report_date DESC);
CREATE INDEX idx_reports_status ON reports(ocr_status);

-- ────────────────────────────────────────────────────────────
-- METRICS / TEST RESULTS
-- ────────────────────────────────────────────────────────────
CREATE TYPE metric_status AS ENUM ('normal', 'low', 'high', 'critical_low', 'critical_high');

CREATE TABLE metrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_name       VARCHAR(255) NOT NULL,
    test_category   VARCHAR(100),                  -- CBC, Lipid, LFT, KFT, etc.
    value           NUMERIC(12, 4) NOT NULL,
    unit            VARCHAR(50),
    ref_range_low   NUMERIC(12, 4),
    ref_range_high  NUMERIC(12, 4),
    ref_range_text  VARCHAR(100),                  -- e.g. "13.5–17.5"
    status          metric_status DEFAULT 'normal',
    deviation_pct   NUMERIC(8, 2),                 -- % deviation from range
    report_date     DATE NOT NULL,                 -- denormalized for trend queries
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_member_id ON metrics(member_id);
CREATE INDEX idx_metrics_report_id ON metrics(report_id);
CREATE INDEX idx_metrics_test_name ON metrics(test_name);
CREATE INDEX idx_metrics_report_date ON metrics(report_date DESC);
CREATE INDEX idx_metrics_member_test ON metrics(member_id, test_name, report_date DESC);

-- ────────────────────────────────────────────────────────────
-- METRICS HISTORY (for trend analysis)
-- ────────────────────────────────────────────────────────────
CREATE VIEW metric_trends AS
SELECT
    member_id,
    test_name,
    unit,
    report_date,
    value,
    status,
    deviation_pct,
    LAG(value) OVER (
        PARTITION BY member_id, test_name
        ORDER BY report_date
    ) AS prev_value,
    ROUND(
        (value - LAG(value) OVER (
            PARTITION BY member_id, test_name
            ORDER BY report_date
        )) / NULLIF(LAG(value) OVER (
            PARTITION BY member_id, test_name
            ORDER BY report_date
        ), 0) * 100, 2
    ) AS change_pct,
    ROW_NUMBER() OVER (
        PARTITION BY member_id, test_name
        ORDER BY report_date DESC
    ) AS recency_rank
FROM metrics
ORDER BY member_id, test_name, report_date DESC;

-- ────────────────────────────────────────────────────────────
-- HEALTH CONDITIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE health_conditions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL,   -- diabetes_risk, hypertension, etc.
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE
);

INSERT INTO health_conditions (code, name, description, icon) VALUES
    ('diabetes_risk',  'Diabetes Risk',     'Pre-diabetes and diabetes prevention',         '🩸'),
    ('obesity',        'Obesity',           'Weight management and BMI control',             '⚖️'),
    ('hypertension',   'Hypertension',      'High blood pressure management',               '🫀'),
    ('back_pain',      'Back Pain',         'Lumbar and spine health',                      '🦴'),
    ('joint_pain',     'Joint / Arthritis', 'Joint health and arthritis management',        '🦵'),
    ('heart_health',   'Heart Health',      'Cardiovascular health and prevention',         '❤️'),
    ('fatty_liver',    'Fatty Liver',       'Hepatic steatosis prevention and management',  '🫁'),
    ('stress_anxiety', 'Stress / Anxiety',  'Mental wellness and stress management',        '🧠');

-- ────────────────────────────────────────────────────────────
-- EXERCISE LIBRARY
-- ────────────────────────────────────────────────────────────
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE exercises (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_id            UUID NOT NULL REFERENCES health_conditions(id),
    name                    VARCHAR(255) NOT NULL,
    difficulty              difficulty_level NOT NULL,
    duration_minutes        INTEGER NOT NULL,
    target_muscles          TEXT NOT NULL,
    description             TEXT,
    indian_lifestyle_note   TEXT,
    youtube_url             TEXT,
    thumbnail_url           TEXT,
    calories_estimate       INTEGER,
    met_value               NUMERIC(4,1),           -- metabolic equivalent
    contraindications       TEXT,
    sort_order              INTEGER DEFAULT 0,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_condition ON exercises(condition_id);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);

-- Seed exercises for all 8 conditions
INSERT INTO exercises (condition_id, name, difficulty, duration_minutes, target_muscles, indian_lifestyle_note, youtube_url, calories_estimate, sort_order)
SELECT c.id, e.name, e.difficulty::difficulty_level, e.duration_minutes, e.target_muscles, e.indian_lifestyle_note, e.youtube_url, e.calories_estimate, e.sort_order
FROM health_conditions c
JOIN (VALUES
    -- DIABETES RISK
    ('diabetes_risk', 'Brisk Walking',      'easy',   30, 'Full body, cardiovascular',    'Perfect for colony/park walks — Indian evening tradition',              'https://youtube.com/watch?v=njeZ29umqVE', 150, 1),
    ('diabetes_risk', 'Surya Namaskar',     'medium', 20, 'Full body, flexibility',       'Traditional morning practice — widely practised across India',          'https://youtube.com/watch?v=pmwHnOEMnC0', 120, 2),
    ('diabetes_risk', 'Cycling',            'easy',   25, 'Legs, glutes, core',           'Evening activity — increasingly popular in Indian cities',              'https://youtube.com/watch?v=KGMRQH8IHBU', 180, 3),
    ('diabetes_risk', 'Post-meal Walking',  'easy',   15, 'Full body, digestion',         'Walk 15 min after each meal — proven to reduce glucose spikes',         NULL, 60, 4),
    ('diabetes_risk', 'Yoga – Pawanmuktasana', 'easy', 20, 'Abdomen, digestion',         'Excellent for insulin sensitivity — beginner yoga',                     'https://youtube.com/watch?v=BVn1oQL3qoE', 70, 5),
    ('diabetes_risk', 'Resistance Band Training', 'medium', 30, 'Arms, legs, core',      'Home-friendly, no gym needed',                                          NULL, 160, 6),
    ('diabetes_risk', 'Swimming',           'medium', 30, 'Full body, cardiovascular',    'Available at many city clubs and govt pools',                           NULL, 250, 7),
    ('diabetes_risk', 'Jumping Jacks',      'medium', 15, 'Full body, cardiovascular',    'Terrace or rooftop exercise — no equipment needed',                    NULL, 120, 8),
    -- HEART HEALTH
    ('heart_health',  'Brisk Walking',      'easy',   40, 'Cardiovascular, legs',         'Daily evening walk in park or neighbourhood',                           'https://youtube.com/watch?v=njeZ29umqVE', 200, 1),
    ('heart_health',  'Yoga – Pranayama',   'easy',   20, 'Respiratory, heart',           'Anulom Vilom and Bhastrika — deeply Indian, highly effective',          'https://youtube.com/watch?v=3sYe0RCeFRs', 50, 2),
    ('heart_health',  'Slow Jogging',       'medium', 25, 'Heart, lungs, legs',           'Evening jog in park — growing trend in Indian cities',                  NULL, 220, 3),
    ('heart_health',  'Chair Yoga',         'easy',   20, 'Flexibility, circulation',     'Office-friendly — popular in Indian IT companies',                      'https://youtube.com/watch?v=9C_iiJe7lk0', 80, 4),
    ('heart_health',  'Surya Namaskar',     'medium', 15, 'Full body, cardiovascular',    'Morning practice ideal for heart health',                               'https://youtube.com/watch?v=pmwHnOEMnC0', 110, 5),
    ('heart_health',  'Dancing / Bollywood', 'medium', 40, 'Full body, cardiovascular',   'Fun cardio — Bollywood dance classes widely available in India',        NULL, 280, 6),
    -- OBESITY
    ('obesity',       'Zumba / Dance',      'medium', 45, 'Full body, cardiovascular',    'Group Zumba classes popular in metros and tier-2 cities',              NULL, 350, 1),
    ('obesity',       'HIIT',               'hard',   25, 'Full body, fat burn',          'Home-friendly — no equipment, 25 min effective workout',               'https://youtube.com/watch?v=ml6cT4AZdqI', 300, 2),
    ('obesity',       'Surya Namaskar',     'medium', 20, 'Full body, metabolism',        'Traditional practice with excellent metabolic benefits',                'https://youtube.com/watch?v=pmwHnOEMnC0', 150, 3),
    ('obesity',       'Skipping / Jump Rope', 'medium', 20, 'Cardio, legs, arms',         'Very low cost — terrace or open area, beloved in Indian schools',       NULL, 220, 4),
    ('obesity',       'Cycling',            'easy',   40, 'Legs, cardiovascular',         'Morning or evening cycling — increasingly common in India',             NULL, 280, 5),
    ('obesity',       'Swimming',           'medium', 40, 'Full body',                    'Excellent low-impact calorie burner for overweight individuals',        NULL, 350, 6),
    -- HYPERTENSION
    ('hypertension',  'Walking',            'easy',   30, 'Cardiovascular',               'Gentle daily walks — most accessible exercise in India',               NULL, 130, 1),
    ('hypertension',  'Yoga – Shavasana',   'easy',   20, 'Relaxation, nervous system',   'Deep relaxation yoga — excellent for BP management',                   'https://youtube.com/watch?v=1VYlOKygdF4', 30, 2),
    ('hypertension',  'Tai Chi / Slow Yoga','easy',   30, 'Balance, circulation',         'Gentle movement — good for Indian elders with hypertension',           NULL, 80, 3),
    ('hypertension',  'Swimming',           'easy',   25, 'Full body, cardiovascular',    'Low-impact, excellent for blood pressure management',                  NULL, 200, 4),
    -- BACK PAIN
    ('back_pain',     'Cat-Cow Stretch',    'easy',   10, 'Spine, core',                  'Simple yoga sequence — do on a yoga mat at home',                     'https://youtube.com/watch?v=kqnua4rHVVA', 30, 1),
    ('back_pain',     'Child''s Pose',      'easy',   10, 'Lower back, hips',             'Restorative yoga pose — excellent for desk workers',                   'https://youtube.com/watch?v=qUtOAP56CRs', 20, 2),
    ('back_pain',     'Pelvic Tilt',        'easy',   15, 'Core, lower back',             'Done lying down — suitable for home practice',                        NULL, 40, 3),
    ('back_pain',     'Walking',            'easy',   20, 'Full body, spine alignment',   'Gentle walks improve posture and reduce back pain',                   NULL, 90, 4),
    -- JOINT PAIN
    ('joint_pain',    'Swimming',           'easy',   30, 'Full body, joint-friendly',    'Zero-impact, best exercise for arthritis patients',                   NULL, 200, 1),
    ('joint_pain',    'Chair Exercises',    'easy',   20, 'Joint mobility, strength',     'Seated exercises — accessible to elderly Indians',                    'https://youtube.com/watch?v=9C_iiJe7lk0', 70, 2),
    ('joint_pain',    'Cycling (stationary)', 'easy', 25, 'Knees, hips, low impact',     'Stationary bike — widely available in Indian gyms',                   NULL, 150, 3),
    ('joint_pain',    'Yoga – Gentle',      'easy',   30, 'Flexibility, joints',          'Gentle yoga tailored for arthritis — many Indian yoga centres offer', 'https://youtube.com/watch?v=v7AYKMP6rOE', 80, 4),
    -- FATTY LIVER
    ('fatty_liver',   'Aerobic Walking',    'easy',   45, 'Cardiovascular, fat burn',     'Daily 45-min walk significantly reduces liver fat',                   NULL, 200, 1),
    ('fatty_liver',   'Yoga – Twists',      'medium', 20, 'Abdominal, liver',             'Twisting yoga poses stimulate liver — Ardha Matsyendrasana',          'https://youtube.com/watch?v=3CYnfuKGHOo', 80, 2),
    ('fatty_liver',   'Cycling',            'medium', 30, 'Cardiovascular, calorie burn', 'Outdoor cycling — effective for liver fat reduction',                 NULL, 220, 3),
    ('fatty_liver',   'HIIT – Low Intensity', 'medium', 20, 'Full body, metabolism',     'Modified HIIT suitable for fatty liver patients',                     NULL, 200, 4),
    -- STRESS / ANXIETY
    ('stress_anxiety','Yoga – Pranayama',   'easy',   20, 'Nervous system, mind',         'Anulom Vilom, Brahmari — ancient Indian stress busters',              'https://youtube.com/watch?v=3sYe0RCeFRs', 40, 1),
    ('stress_anxiety','Meditation',         'easy',   15, 'Mind, parasympathetic system', 'Vipassana-style meditation — widely practised in India',              'https://youtube.com/watch?v=inpok4MKVLM', 20, 2),
    ('stress_anxiety','Walking in Nature',  'easy',   30, 'Full body, mind',              'Morning walks in park or garden — deeply restorative',               NULL, 120, 3),
    ('stress_anxiety','Dancing',            'easy',   30, 'Full body, mood',              'Bollywood dance is culturally fun and naturally mood-lifting',        NULL, 200, 4)
) AS e(condition_code, name, difficulty, duration_minutes, target_muscles, indian_lifestyle_note, youtube_url, calories_estimate, sort_order)
ON c.code = e.condition_code;

-- ────────────────────────────────────────────────────────────
-- HEALTH INSIGHTS (AI-generated, stored per report)
-- ────────────────────────────────────────────────────────────
CREATE TYPE insight_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE health_insights (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area            VARCHAR(255) NOT NULL,          -- e.g. "Pre-Diabetes Risk"
    severity        insight_severity NOT NULL,
    icon            VARCHAR(10),
    tip             TEXT NOT NULL,
    related_metrics TEXT[],                         -- array of metric names
    condition_code  VARCHAR(50),
    generated_by    VARCHAR(100) DEFAULT 'gpt-4',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_report_id ON health_insights(report_id);
CREATE INDEX idx_insights_member_id ON health_insights(member_id);

-- ────────────────────────────────────────────────────────────
-- MEMBER CONDITIONS (linking members to health conditions)
-- ────────────────────────────────────────────────────────────
CREATE TABLE member_conditions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id       UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    condition_id    UUID NOT NULL REFERENCES health_conditions(id),
    confidence      NUMERIC(4,2),                   -- 0–1, AI-determined
    source          VARCHAR(50) DEFAULT 'ai',        -- ai, manual
    detected_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(member_id, condition_id)
);

-- ────────────────────────────────────────────────────────────
-- FAQ TOPICS
-- ────────────────────────────────────────────────────────────
CREATE TABLE faq_topics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic           VARCHAR(100) NOT NULL,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    icon            VARCHAR(10),
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- NOTIFICATION PREFERENCES
-- ────────────────────────────────────────────────────────────
CREATE TABLE notification_prefs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    report_reminders    BOOLEAN DEFAULT TRUE,
    insight_alerts      BOOLEAN DEFAULT TRUE,
    exercise_reminders  BOOLEAN DEFAULT FALSE,
    email_enabled       BOOLEAN DEFAULT TRUE,
    push_enabled        BOOLEAN DEFAULT FALSE,
    reminder_day_of_week INTEGER DEFAULT 1,         -- 1=Mon
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at auto-update
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_family_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (Supabase-compatible)
-- ────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_self_policy ON users
    FOR ALL USING (id = current_setting('app.user_id')::UUID);

CREATE POLICY family_owner_policy ON family_members
    FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

CREATE POLICY reports_owner_policy ON reports
    FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

CREATE POLICY metrics_owner_policy ON metrics
    FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

CREATE POLICY insights_owner_policy ON health_insights
    FOR ALL USING (user_id = current_setting('app.user_id')::UUID);
