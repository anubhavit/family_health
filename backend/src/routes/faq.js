// src/routes/faq.js
const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Public endpoint — no auth required
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, topic, question, answer, icon FROM faq_topics WHERE is_active=TRUE ORDER BY sort_order, topic',
    );
    res.json({ faqs: rows });
  } catch (err) {
    // Fallback to static data if DB fails
    res.json({ faqs: STATIC_FAQS });
  }
});

module.exports = router;

// Static fallback FAQs (India-specific)
const STATIC_FAQS = [
  { topic: "Heart Health", icon: "❤️", question: "What are early signs of heart disease?", answer: "Common signs include chest discomfort, shortness of breath, fatigue, irregular heartbeat, and swollen ankles. High cholesterol and blood pressure are major silent risk factors. Regular lipid profiles every 6 months are recommended for those over 35." },
  { topic: "Diabetes", icon: "🩸", question: "What is pre-diabetes and how to reverse it?", answer: "Pre-diabetes means blood glucose is 100–125 mg/dL (fasting) or HbA1c 5.7–6.4%. It can often be reversed through weight loss (5–10%), regular exercise (150 min/week), and reduced refined carbohydrates like white rice and maida." },
  { topic: "Cholesterol", icon: "🫀", question: "Which Indian foods help reduce cholesterol?", answer: "Methi seeds, amla, garlic, oats, flaxseeds, and walnuts are excellent cholesterol reducers. Avoid ghee excess, vanaspati, and fried snacks. Choosing mustard oil or olive oil helps LDL management." },
  { topic: "Vitamin D", icon: "☀️", question: "Why is Vitamin D deficiency so common in India?", answer: "Despite abundant sunshine, indoor lifestyles, covered clothing, and darker skin tones make deficiency common. 10–15 minutes of midday sun on arms/legs plus dietary sources like fatty fish, eggs, and fortified milk help." },
  { topic: "Obesity", icon: "⚖️", question: "What is a healthy Indian approach to weight loss?", answer: "Replace white rice with millets (jowar, bajra, ragi). Control portion sizes. Eat a large breakfast, moderate lunch, light dinner. Walk 8,000–10,000 steps daily. Avoid late-night eating." },
  { topic: "Arthritis", icon: "🦴", question: "Can diet help with joint pain?", answer: "Anti-inflammatory foods like turmeric with black pepper, ginger, omega-3s from fish, and antioxidant-rich vegetables help. Maintain healthy weight to reduce joint load. Swimming and cycling are excellent low-impact options." },
];
