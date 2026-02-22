# Family Health Insights India — API Reference

**Base URL:** `https://api.familyhealthinsights.in/api/v1`
**Auth:** Bearer JWT token in `Authorization` header
**Content-Type:** `application/json`

---

## Authentication

### POST `/auth/signup`
Create a new user account.

**Request body:**
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@example.com",
  "password": "SecurePass@123",
  "date_of_birth": "1985-03-15"
}
```
**Response 200:**
```json
{
  "message": "Account created successfully",
  "user": { "id": "uuid", "name": "Rajesh Kumar", "email": "...", "age": 39 },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```
**Errors:** 409 email taken, 422 validation, 400 age ≥ 50

---

### POST `/auth/login`
**Request body:**
```json
{ "email": "rajesh@example.com", "password": "SecurePass@123" }
```
**Response 200:** Same structure as signup

---

### GET `/auth/google`
Redirect to Google OAuth consent screen.
- Scopes: `profile`, `email`
- On success, redirects to `FRONTEND_URL/auth/callback?at=<token>&rt=<refresh>`

### GET `/auth/google/callback`
Google OAuth callback (handled by server).

---

### POST `/auth/refresh`
**Request body:** `{ "refreshToken": "eyJ..." }`
**Response 200:** New `{ tokens: { accessToken, refreshToken } }`

---

### POST `/auth/logout`
🔒 Protected. Revokes current session token.
**Response 200:** `{ "message": "Logged out successfully" }`

---

### GET `/auth/me`
🔒 Protected. Get current user.
**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Rajesh Kumar",
    "email": "rajesh@example.com",
    "dateOfBirth": "1985-03-15",
    "age": 39,
    "profileImage": "https://..."
  }
}
```

---

## Family Members

All endpoints 🔒 Protected (Bearer token required).

### GET `/family`
List all active family members for authenticated user.
**Response 200:**
```json
{
  "members": [
    {
      "id": "uuid",
      "name": "Rajesh Kumar",
      "age": 39,
      "gender": "male",
      "relationship": "self",
      "dietary_pref": "non-veg",
      "risk_level": "moderate",
      "report_count": 3,
      "last_report_date": "2025-01-15"
    }
  ]
}
```

---

### GET `/family/:id`
Get single member with conditions.

---

### POST `/family`
Create a new family member.
```json
{
  "name": "Priya Kumar",
  "date_of_birth": "1984-06-22",
  "gender": "female",
  "relationship": "spouse",
  "dietary_pref": "veg",
  "notes": "Hypothyroid patient"
}
```
**Limits:** Max 10 members per account.
**Valid genders:** `male`, `female`, `other`
**Valid diets:** `veg`, `non-veg`, `eggetarian`, `jain`, `vegan`
**Valid relationships:** `self`, `spouse`, `son`, `daughter`, `father`, `mother`, `sibling`, `other`

---

### PUT `/family/:id`
Update family member. Same body as POST.

---

### DELETE `/family/:id`
Soft-delete a family member. Cannot delete `self`.

---

## Reports

### GET `/reports?memberId=<uuid>`
List all reports for a member (with extracted metrics).

### GET `/reports/:id`
Get single report with metrics + insights + presigned download URL.

### POST `/reports/upload`
Upload a medical report PDF/image.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `report` | File | ✅ | PDF, JPEG, PNG, WebP. Max 20MB |
| `memberId` | string | ✅ | UUID of family member |
| `reportDate` | string | ✅ | ISO date: `2025-01-15` |
| `labName` | string | ❌ | Auto-detected by OCR |
| `reportType` | string | ❌ | e.g. "CBC + Lipid Profile" |

**Response 202:** (Processing is async)
```json
{
  "message": "Report uploaded. Processing started.",
  "reportId": "uuid",
  "status": "pending"
}
```

**Supported lab formats:** Thyrocare, Dr Lal PathLabs, Metropolis, SRL, Apollo, Generic

---

### GET `/reports/:id/status`
Poll processing status.
```json
{
  "id": "uuid",
  "ocr_status": "completed",  // pending | processing | completed | failed
  "processing_ms": 4230
}
```

### DELETE `/reports/:id`
Delete report + metrics + insights + S3 file.

---

## Metrics & Trends

### GET `/metrics/summary?memberId=<uuid>`
Latest values for all metrics with status flags.
```json
{
  "total": 10,
  "high": 4,
  "low": 2,
  "normal": 4,
  "critical": 0,
  "byCategory": {
    "LIPID_PROFILE": [...],
    "DIABETES": [...],
    "CBC": [...]
  },
  "latestMetrics": [...]
}
```

---

### GET `/metrics/trends?memberId=<uuid>&testName=<name>`
Trend data for one or all metrics.
```json
{
  "trends": [
    {
      "test_name": "Total Cholesterol",
      "unit": "mg/dL",
      "data_points": 3,
      "trend": "improving",  // improving | stable | worsening
      "change_pct": -5.2,
      "latest_value": 218,
      "history": [
        { "date": "2024-01-20", "value": 230, "status": "high" },
        { "date": "2024-07-10", "value": 224, "status": "high" },
        { "date": "2025-01-15", "value": 218, "status": "high" }
      ]
    }
  ]
}
```

---

## Exercises

### GET `/exercises`
All 8 health conditions with their full exercise libraries.
```json
{
  "conditions": [
    {
      "id": "uuid",
      "code": "diabetes_risk",
      "name": "Diabetes Risk",
      "icon": "🩸",
      "exercises": [
        {
          "name": "Brisk Walking",
          "difficulty": "easy",
          "duration_minutes": 30,
          "target_muscles": "Full body, cardiovascular",
          "indian_lifestyle_note": "Perfect for colony/park walks",
          "youtube_url": "https://...",
          "calories_estimate": 150
        }
      ]
    }
  ]
}
```

### GET `/exercises/recommended?memberId=<uuid>`
AI-personalized exercise recommendations based on member's conditions.
```json
{
  "isPersonalized": true,
  "conditions": [
    { "code": "diabetes_risk", "name": "Diabetes Risk", "confidence": 0.85 }
  ],
  "exercises": [...]
}
```

---

## Health Insights

### GET `/insights?memberId=<uuid>`
Latest AI-generated health insights for a member.
```json
{
  "insights": [
    {
      "id": "uuid",
      "area": "Pre-Diabetes Risk",
      "severity": "high",
      "icon": "⚠️",
      "tip": "Your HbA1c of 5.8%...",
      "related_metrics": ["HbA1c", "Blood Glucose (F)"],
      "condition_code": "diabetes_risk",
      "lab_name": "Thyrocare",
      "report_date": "2025-01-15"
    }
  ]
}
```

---

## FAQ

### GET `/faq`
Public endpoint — no auth required. Returns all FAQ topics.

---

## Error Responses

All errors follow this format:
```json
{ "error": "Human readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing params |
| 401 | Unauthorized — invalid or expired token |
| 403 | Forbidden — accessing another user's data |
| 404 | Resource not found |
| 409 | Conflict — e.g. duplicate email |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All API endpoints | 100 req | 15 min |
| Auth endpoints | 10 req | 15 min |
| File upload | 20 req | 60 min |

---

## Security Notes

- All files encrypted with AES-256-CBC before S3 upload
- S3 server-side encryption also enabled (AES-256)
- JWT tokens signed with HS256, stored in memory (not localStorage)
- Sessions tracked in DB — can be revoked server-side
- All IP addresses stored as SHA-256 hashes (never plaintext)
- Row Level Security enforced in PostgreSQL
- Full audit log for all write operations
