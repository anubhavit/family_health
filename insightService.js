// src/services/insightService.js
const OpenAI = require('openai');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── INSIGHT GENERATION PROMPT ────────────────────────────────
const INSIGHT_SYSTEM_PROMPT = `You are a preventive health advisor for Indian users.

Given a list of lab test results, generate 3–6 personalized, actionable health insights.

RULES:
- Focus on PREVENTION and LIFESTYLE, never diagnosis
- Use Indian food examples (dal, sabzi, ragi, jowar, amla, methi, etc.)
- Reference Indian lifestyle habits (walking in colony, yoga, chai reduction, etc.)
- Non-clinical, friendly tone — like a knowledgeable friend
- Include ONLY findings that need attention (abnormal or borderline)
- Each insight must be specific, practical, and culturally relevant

For each insight return:
- area: focus area name (e.g., "Cholesterol Management", "Pre-Diabetes Risk")
- severity: "low" | "medium" | "high" | "critical"
- icon: a single emoji
- tip: 2–3 sentence actionable tip (mention specific Indian foods/activities)
- related_metrics: array of metric names that triggered this insight
- condition_code: one of: diabetes_risk, obesity, hypertension, heart_health, fatty_liver, stress_anxiety, joint_pain, back_pain, or null

Respond ONLY with valid JSON array of insight objects. No markdown, no explanation.`;

// ─── RULE-BASED INSIGHTS (fallback) ──────────────────────────
const RULE_BASED_INSIGHTS = {
  'Total Cholesterol': (v) => v > 240 ? {
    area: 'High Cholesterol',
    severity: 'high',
    icon: '🫀',
    tip: `Your total cholesterol of ${v} mg/dL is high. Switch to mustard or olive oil, add 1 tsp ground flaxseed to meals daily, and walk 30 minutes post-dinner. Avoid puri, pakora, and vanaspati.`,
    condition_code: 'heart_health',
  } : v > 200 ? {
    area: 'Borderline Cholesterol',
    severity: 'medium',
    icon: '⚡',
    tip: `Cholesterol at ${v} mg/dL is borderline. Include methi seeds water morning, replace refined snacks with chana or makhana, and add 2–3 walnuts daily.`,
    condition_code: 'heart_health',
  } : null,

  'LDL Cholesterol': (v) => v > 160 ? {
    area: 'High LDL Cholesterol',
    severity: 'high',
    icon: '🫀',
    tip: `LDL at ${v} mg/dL needs attention. Reduce full-fat dairy, replace white rice with oats or barley daliya, and include garlic in your cooking — it naturally lowers LDL.`,
    condition_code: 'heart_health',
  } : null,

  'Blood Glucose (F)': (v) => v > 126 ? {
    area: 'High Blood Sugar',
    severity: 'high',
    icon: '🩸',
    tip: `Fasting glucose of ${v} mg/dL is in diabetic range. Reduce rice portions, replace with millets. Walk 15 minutes after every meal. Avoid fruit juices — eat whole fruit instead.`,
    condition_code: 'diabetes_risk',
  } : v > 100 ? {
    area: 'Pre-Diabetes Risk',
    severity: 'medium',
    icon: '⚠️',
    tip: `Fasting glucose at ${v} mg/dL is in pre-diabetes range. This is reversible! Try methi seed water, switch to ragi/jowar rotis, and add a brisk 30-minute daily walk.`,
    condition_code: 'diabetes_risk',
  } : null,

  'HbA1c': (v) => v >= 6.5 ? {
    area: 'Diabetes Risk — HbA1c Elevated',
    severity: 'high',
    icon: '🩸',
    tip: `HbA1c of ${v}% indicates diabetes. Please consult a doctor. Meanwhile, completely eliminate maida products, sugar in chai, and sweet desserts. Choose whole grains, legumes, and vegetables.`,
    condition_code: 'diabetes_risk',
  } : v >= 5.7 ? {
    area: 'Pre-Diabetes — HbA1c Watch',
    severity: 'medium',
    icon: '⚠️',
    tip: `HbA1c at ${v}% indicates pre-diabetes. Losing 5% body weight and 150 minutes of exercise weekly has been shown to reverse this. Start with evening walks and reduce chai sugar.`,
    condition_code: 'diabetes_risk',
  } : null,

  'Vitamin D': (v) => v < 20 ? {
    area: 'Vitamin D Deficiency',
    severity: 'medium',
    icon: '☀️',
    tip: `Vitamin D at ${v} ng/mL is deficient. Get 15 minutes of mid-morning sun (before 10 AM) on arms and face daily. Include eggs, fatty fish, and fortified milk. Consult doctor for supplementation.`,
    condition_code: null,
  } : null,

  'Hemoglobin': (v, gender) => {
    const threshold = gender === 'female' ? 12.0 : 13.5;
    return v < threshold ? {
      area: 'Low Hemoglobin',
      severity: v < threshold - 2 ? 'high' : 'medium',
      icon: '💪',
      tip: `Hemoglobin at ${v} g/dL is below normal. Include iron-rich foods: palak dal, rajma, til (sesame), and amla. Pair with Vitamin C (lemon water) to improve absorption. Avoid tea with meals.`,
      condition_code: null,
    } : null;
  },

  'TSH': (v) => v > 4.5 ? {
    area: 'Thyroid Function — TSH High',
    severity: 'medium',
    icon: '🦋',
    tip: `TSH at ${v} µIU/mL suggests possible hypothyroidism. Consult an endocrinologist. Include selenium-rich foods (Brazil nuts, sunflower seeds) and avoid excess soy. Stress management with yoga helps thyroid health.`,
    condition_code: null,
  } : null,

  'Triglycerides': (v) => v > 200 ? {
    area: 'High Triglycerides',
    severity: 'high',
    icon: '🍬',
    tip: `Triglycerides at ${v} mg/dL are high. This is strongly linked to sugar and refined carb intake. Cut soft drinks, mithai, white bread, and alcohol. Omega-3 from fish or flaxseed helps reduce triglycerides.`,
    condition_code: 'heart_health',
  } : null,
};

// ─── GENERATE INSIGHTS WITH AI ────────────────────────────────
async function generateInsightsWithAI(metrics) {
  const relevantMetrics = metrics.filter(m => m.status !== 'normal');
  if (!relevantMetrics.length) return [];

  const metricsText = relevantMetrics.map(m =>
    `${m.test_name}: ${m.value} ${m.unit || ''} (ref: ${m.ref_range_text || 'N/A'}, status: ${m.status})`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: `Lab results:\n${metricsText}` },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.error('AI insight generation failed', { error: err.message });
    return [];
  }
}

// ─── GENERATE AND STORE INSIGHTS ─────────────────────────────
async function generateInsights(reportId, memberId, userId, metrics) {
  try {
    let insights = await generateInsightsWithAI(metrics);

    // Fallback: rule-based if AI fails or returns nothing
    if (!insights.length) {
      for (const m of metrics) {
        const ruleFn = RULE_BASED_INSIGHTS[m.test_name];
        if (ruleFn && m.status !== 'normal') {
          const insight = ruleFn(m.value);
          if (insight) {
            insights.push({
              ...insight,
              related_metrics: [m.test_name],
            });
          }
        }
      }
    }

    // Store insights in DB
    for (const ins of insights.slice(0, 6)) {
      await query(
        `INSERT INTO health_insights (report_id, member_id, user_id, area, severity, icon, tip, related_metrics, condition_code, generated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          reportId, memberId, userId,
          ins.area, ins.severity, ins.icon, ins.tip,
          ins.related_metrics || [],
          ins.condition_code || null,
          insights.length > 0 ? 'gpt-4' : 'rules',
        ]
      );

      // Link member to condition if applicable
      if (ins.condition_code) {
        await query(
          `INSERT INTO member_conditions (member_id, condition_id, confidence, source)
           SELECT $1, id, 0.8, 'ai' FROM health_conditions WHERE code = $2
           ON CONFLICT (member_id, condition_id) DO UPDATE SET detected_at = NOW()`,
          [memberId, ins.condition_code]
        );
      }
    }

    logger.info('Insights generated', { reportId, count: insights.length });
  } catch (err) {
    logger.error('Insight storage error', { error: err.message });
  }
}

module.exports = { generateInsights };
