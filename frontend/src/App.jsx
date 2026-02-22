import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, BarChart, Bar, Legend
} from "recharts";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1B4332",
  primaryLight: "#2D6A4F",
  accent: "#F4A261",
  accentLight: "#FFDDD2",
  danger: "#C1121F",
  warning: "#E9C46A",
  success: "#52B788",
  bg: "#F8F7F2",
  card: "#FFFFFF",
  text: "#1A1A2E",
  muted: "#6B7280",
  border: "#E5E7EB",
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const FAMILY_MEMBERS = [
  { id: 1, name: "Rajesh Kumar", age: 44, gender: "Male", relationship: "Self", diet: "non-veg", avatar: "👨", risk: "moderate" },
  { id: 2, name: "Priya Kumar", age: 40, gender: "Female", relationship: "Spouse", diet: "veg", avatar: "👩", risk: "low" },
  { id: 3, name: "Arjun Kumar", age: 18, gender: "Male", relationship: "Son", diet: "non-veg", avatar: "👦", risk: "low" },
  { id: 4, name: "Meera Kumar", age: 72, gender: "Female", relationship: "Mother", diet: "jain", avatar: "👵", risk: "high" },
];

const REPORTS = {
  1: [
    {
      id: 1, date: "2025-01-15", lab: "Thyrocare", type: "CBC + Lipid Profile",
      metrics: [
        { name: "Hemoglobin", value: 13.2, unit: "g/dL", ref: "13.5–17.5", status: "low", flag: "↓" },
        { name: "Total Cholesterol", value: 218, unit: "mg/dL", ref: "<200", status: "high", flag: "↑" },
        { name: "LDL Cholesterol", value: 142, unit: "mg/dL", ref: "<130", status: "high", flag: "↑" },
        { name: "HDL Cholesterol", value: 42, unit: "mg/dL", ref: ">40", status: "normal", flag: "✓" },
        { name: "Triglycerides", value: 186, unit: "mg/dL", ref: "<150", status: "high", flag: "↑" },
        { name: "Blood Glucose (F)", value: 108, unit: "mg/dL", ref: "70–100", status: "high", flag: "↑" },
        { name: "HbA1c", value: 5.8, unit: "%", ref: "<5.7", status: "high", flag: "↑" },
        { name: "Vitamin D", value: 18, unit: "ng/mL", ref: "30–100", status: "low", flag: "↓" },
        { name: "Vitamin B12", value: 310, unit: "pg/mL", ref: "200–900", status: "normal", flag: "✓" },
        { name: "TSH", value: 2.4, unit: "µIU/mL", ref: "0.4–4.0", status: "normal", flag: "✓" },
      ]
    },
    {
      id: 2, date: "2024-07-10", lab: "Dr Lal PathLabs", type: "CBC + Lipid Profile",
      metrics: [
        { name: "Hemoglobin", value: 13.0, unit: "g/dL", ref: "13.5–17.5", status: "low", flag: "↓" },
        { name: "Total Cholesterol", value: 224, unit: "mg/dL", ref: "<200", status: "high", flag: "↑" },
        { name: "LDL Cholesterol", value: 150, unit: "mg/dL", ref: "<130", status: "high", flag: "↑" },
        { name: "HDL Cholesterol", value: 39, unit: "mg/dL", ref: ">40", status: "low", flag: "↓" },
        { name: "Triglycerides", value: 198, unit: "mg/dL", ref: "<150", status: "high", flag: "↑" },
        { name: "Blood Glucose (F)", value: 112, unit: "mg/dL", ref: "70–100", status: "high", flag: "↑" },
        { name: "HbA1c", value: 6.1, unit: "%", ref: "<5.7", status: "high", flag: "↑" },
        { name: "Vitamin D", value: 14, unit: "ng/mL", ref: "30–100", status: "low", flag: "↓" },
        { name: "Vitamin B12", value: 280, unit: "pg/mL", ref: "200–900", status: "normal", flag: "✓" },
        { name: "TSH", value: 2.8, unit: "µIU/mL", ref: "0.4–4.0", status: "normal", flag: "✓" },
      ]
    },
    {
      id: 3, date: "2024-01-20", lab: "Metropolis", type: "Full Body Checkup",
      metrics: [
        { name: "Hemoglobin", value: 12.8, unit: "g/dL", ref: "13.5–17.5", status: "low", flag: "↓" },
        { name: "Total Cholesterol", value: 230, unit: "mg/dL", ref: "<200", status: "high", flag: "↑" },
        { name: "LDL Cholesterol", value: 158, unit: "mg/dL", ref: "<130", status: "high", flag: "↑" },
        { name: "HDL Cholesterol", value: 37, unit: "mg/dL", ref: ">40", status: "low", flag: "↓" },
        { name: "Triglycerides", value: 210, unit: "mg/dL", ref: "<150", status: "high", flag: "↑" },
        { name: "Blood Glucose (F)", value: 116, unit: "mg/dL", ref: "70–100", status: "high", flag: "↑" },
        { name: "HbA1c", value: 6.3, unit: "%", ref: "<5.7", status: "high", flag: "↑" },
        { name: "Vitamin D", value: 11, unit: "ng/mL", ref: "30–100", status: "low", flag: "↓" },
        { name: "Vitamin B12", value: 260, unit: "pg/mL", ref: "200–900", status: "normal", flag: "✓" },
        { name: "TSH", value: 3.1, unit: "µIU/mL", ref: "0.4–4.0", status: "normal", flag: "✓" },
      ]
    }
  ],
  2: [
    {
      id: 4, date: "2025-02-01", lab: "Thyrocare", type: "Thyroid + CBC",
      metrics: [
        { name: "Hemoglobin", value: 11.8, unit: "g/dL", ref: "12.0–16.0", status: "low", flag: "↓" },
        { name: "TSH", value: 5.8, unit: "µIU/mL", ref: "0.4–4.0", status: "high", flag: "↑" },
        { name: "Total Cholesterol", value: 188, unit: "mg/dL", ref: "<200", status: "normal", flag: "✓" },
        { name: "Vitamin D", value: 22, unit: "ng/mL", ref: "30–100", status: "low", flag: "↓" },
        { name: "Blood Glucose (F)", value: 94, unit: "mg/dL", ref: "70–100", status: "normal", flag: "✓" },
      ]
    }
  ]
};

const TREND_DATA = {
  cholesterol: [
    { month: "Jan '24", value: 230, label: "Jan 24" },
    { month: "Jul '24", value: 224, label: "Jul 24" },
    { month: "Jan '25", value: 218, label: "Jan 25" },
  ],
  ldl: [
    { month: "Jan '24", value: 158 },
    { month: "Jul '24", value: 150 },
    { month: "Jan '25", value: 142 },
  ],
  glucose: [
    { month: "Jan '24", value: 116 },
    { month: "Jul '24", value: 112 },
    { month: "Jan '25", value: 108 },
  ],
  hba1c: [
    { month: "Jan '24", value: 6.3 },
    { month: "Jul '24", value: 6.1 },
    { month: "Jan '25", value: 5.8 },
  ],
  vitD: [
    { month: "Jan '24", value: 11 },
    { month: "Jul '24", value: 14 },
    { month: "Jan '25", value: 18 },
  ],
};

const EXERCISES = {
  diabetes: [
    { name: "Brisk Walking", difficulty: "Easy", duration: "30 min", muscles: "Full body", youtube: "https://youtube.com/watch?v=example1", suitability: "Perfect for Indian lifestyle — can be done in colony/park" },
    { name: "Surya Namaskar", difficulty: "Medium", duration: "15 min", muscles: "Full body", youtube: "https://youtube.com/watch?v=example2", suitability: "Early morning, ideal for Indian routines" },
    { name: "Cycling", difficulty: "Easy", duration: "25 min", muscles: "Legs, core", youtube: "#", suitability: "Evening activity, widely available" },
    { name: "Swimming", difficulty: "Medium", duration: "30 min", muscles: "Full body", youtube: "#", suitability: "Available in many Indian cities" },
  ],
  heart: [
    { name: "Brisk Walking", difficulty: "Easy", duration: "30 min", muscles: "Cardiovascular", youtube: "#", suitability: "Excellent for heart health — daily routine" },
    { name: "Yoga – Pranayama", difficulty: "Easy", duration: "20 min", muscles: "Respiratory, stress", youtube: "#", suitability: "Morning practice, deeply Indian" },
    { name: "Slow Jogging", difficulty: "Medium", duration: "20 min", muscles: "Heart, legs", youtube: "#", suitability: "Evening jog in park" },
    { name: "Chair Yoga", difficulty: "Easy", duration: "15 min", muscles: "Flexibility, heart", youtube: "#", suitability: "Office-friendly, popular in India" },
  ],
  obesity: [
    { name: "Zumba / Dance", difficulty: "Medium", duration: "40 min", muscles: "Full body, cardio", youtube: "#", suitability: "Group classes widely available in metros" },
    { name: "HIIT", difficulty: "Hard", duration: "25 min", muscles: "Full body", youtube: "#", suitability: "Home-friendly, no equipment" },
    { name: "Surya Namaskar", difficulty: "Medium", duration: "20 min", muscles: "Full body", youtube: "#", suitability: "Traditional Indian practice" },
    { name: "Skipping / Jump Rope", difficulty: "Medium", duration: "15 min", muscles: "Cardio, legs", youtube: "#", suitability: "Very low cost, rooftop or terrace" },
  ],
};

const FAQS = [
  { topic: "Heart Health", icon: "❤️", q: "What are early signs of heart disease?", a: "Common signs include chest discomfort, shortness of breath, fatigue, irregular heartbeat, and swollen ankles. High cholesterol and blood pressure are major silent risk factors. Regular lipid profiles every 6 months are recommended for those over 35." },
  { topic: "Diabetes", icon: "🩸", q: "What is pre-diabetes and how to reverse it?", a: "Pre-diabetes means blood glucose is 100–125 mg/dL (fasting) or HbA1c 5.7–6.4%. It can often be reversed through weight loss (5–10%), regular exercise (150 min/week), and reduced refined carbohydrates like white rice and maida." },
  { topic: "Cholesterol", icon: "🫀", q: "Which Indian foods help reduce cholesterol?", a: "Methi seeds, amla, garlic, oats, flaxseeds, and walnuts are excellent cholesterol reducers. Avoid ghee excess, vanaspati, and fried snacks. Choosing mustard oil or olive oil over coconut oil helps LDL management." },
  { topic: "Vitamin D", icon: "☀️", q: "Why is Vitamin D deficiency so common in India?", a: "Despite abundant sunshine, indoor lifestyles, covered clothing, and darker skin tones (which require more sun exposure) make deficiency common. 10–15 minutes of midday sun on arms/legs plus dietary sources like fatty fish, eggs, and fortified milk help." },
  { topic: "Obesity", icon: "⚖️", q: "What is a healthy Indian approach to weight loss?", a: "Replace white rice with millets (jowar, bajra, ragi). Control portion sizes — use katoris not unlimited servings. Eat a large breakfast, moderate lunch, light dinner. Walk 8,000–10,000 steps daily. Avoid late-night eating." },
  { topic: "Arthritis", icon: "🦴", q: "Can diet help with joint pain in India?", a: "Anti-inflammatory foods like turmeric (with black pepper), ginger, omega-3s from fish, and antioxidant-rich vegetables help. Maintain healthy weight to reduce joint load. Swimming and cycling are excellent low-impact exercise options." },
];

const HEALTH_INSIGHTS = {
  1: [
    { icon: "⚠️", area: "Pre-Diabetes Risk", severity: "high", tip: "Your HbA1c of 5.8% and fasting glucose of 108 indicate pre-diabetes range. Reducing refined carbs, adding a 30-min post-meal walk, and including methi water in the morning can help significantly." },
    { icon: "🫀", area: "Cholesterol Management", severity: "high", tip: "LDL at 142 mg/dL is above target. Consider replacing full-fat dairy with low-fat alternatives, adding 1 tsp ground flaxseed to meals, and reducing deep-fried foods. Retest in 3 months." },
    { icon: "☀️", area: "Vitamin D Deficiency", severity: "medium", tip: "At 18 ng/mL, your Vitamin D is insufficient. 15 minutes of morning sunlight (arms and face) and a supplement of 60,000 IU weekly for 8 weeks (after doctor consultation) is typically recommended." },
    { icon: "💪", area: "Hemoglobin Borderline", severity: "low", tip: "Slightly below range. Include iron-rich foods: spinach dal, rajma, sesame seeds, and amla. Pair with Vitamin C sources like lemon to improve absorption." },
  ]
};

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const styles = {
    high: { bg: "#FEE2E2", color: "#991B1B", text: "High ↑" },
    low: { bg: "#FEF3C7", color: "#92400E", text: "Low ↓" },
    normal: { bg: "#D1FAE5", color: "#065F46", text: "Normal ✓" },
  };
  const s = styles[status] || styles.normal;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: "99px",
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.02em"
    }}>{s.text}</span>
  );
};

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "#fff", borderRadius: "16px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    padding: "20px", cursor: onClick ? "pointer" : "default",
    transition: "box-shadow 0.2s",
    ...style
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = "0 6px 30px rgba(0,0,0,0.12)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)")}
  >{children}</div>
);

const Pill = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: "99px", border: "none", cursor: "pointer",
    background: active ? COLORS.primary : "#F3F4F6",
    color: active ? "#fff" : COLORS.text,
    fontWeight: active ? 700 : 500, fontSize: "14px",
    transition: "all 0.2s",
    fontFamily: "inherit"
  }}>{children}</button>
);

const TrendIndicator = ({ data }) => {
  const first = data[0].value, last = data[data.length - 1].value;
  const diff = last - first;
  const improving = diff < 0;
  return (
    <span style={{ color: improving ? COLORS.success : COLORS.danger, fontSize: "12px", fontWeight: 700 }}>
      {improving ? "↘ Improving" : "↗ Watch"}
    </span>
  );
};

// ─── PAGES ────────────────────────────────────────────────────────────────────

// LOGIN PAGE
function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("rajesh@example.com");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ name: "Rajesh Kumar", email }); }, 1200);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ name: "Rajesh Kumar", email: "rajesh@gmail.com" }); }, 1000);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 40%, #52B788 100%)",
      padding: "20px", fontFamily: "'Nunito', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input { font-family: 'Nunito', sans-serif !important; }
      `}</style>

      {/* Decorative circles */}
      <div style={{ position: "fixed", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(244,162,97,0.15)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏥</div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
            Family Health<br />Insights India
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8 }}>
            Preventive health for your whole family
          </p>
        </div>

        <Card style={{ borderRadius: 24 }}>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: 24, background: "#F3F4F6", borderRadius: 12, padding: 4 }}>
            {["login", "signup"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer",
                background: tab === t ? "#fff" : "transparent",
                fontWeight: tab === t ? 700 : 500, fontSize: 14,
                color: tab === t ? COLORS.primary : COLORS.muted,
                boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s", fontFamily: "inherit"
              }}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Google Button */}
          <button onClick={handleGoogle} style={{
            width: "100%", padding: "12px", border: "2px solid #E5E7EB", borderRadius: 12,
            background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10, fontWeight: 700, fontSize: 14,
            color: COLORS.text, marginBottom: 20, fontFamily: "inherit", transition: "all 0.2s"
          }}>
            <span style={{ fontSize: 20 }}>🔵</span> Continue with Google
          </button>

          <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} /> or <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {tab === "signup" && (
            <>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name"
                style={{ width: "100%", padding: "12px 16px", border: "2px solid #E5E7EB", borderRadius: 12, marginBottom: 12, fontSize: 14, outline: "none" }} />
              <input value={age} onChange={e => setAge(e.target.value)} placeholder="Age (must be under 50)"
                type="number" max={49}
                style={{ width: "100%", padding: "12px 16px", border: "2px solid #E5E7EB", borderRadius: 12, marginBottom: 12, fontSize: 14, outline: "none" }} />
            </>
          )}

          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            style={{ width: "100%", padding: "12px 16px", border: "2px solid #E5E7EB", borderRadius: 12, marginBottom: 12, fontSize: 14, outline: "none" }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
            style={{ width: "100%", padding: "12px 16px", border: "2px solid #E5E7EB", borderRadius: 12, marginBottom: 20, fontSize: 14, outline: "none" }} />

          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            background: loading ? "#9CA3AF" : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "inherit", transition: "all 0.2s"
          }}>
            {loading ? "Signing in..." : (tab === "login" ? "Sign In →" : "Create Account →")}
          </button>

          <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 11, marginTop: 16 }}>
            🔒 Your health data is encrypted and secure
          </p>
        </Card>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 20 }}>
          For users below 50 years · Educational use only · Not medical advice
        </p>
      </div>
    </div>
  );
}

// SIDEBAR NAV
function Sidebar({ page, setPage, user, selectedMember, setSelectedMember }) {
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "family", icon: "👨‍👩‍👧‍👦", label: "Family" },
    { id: "reports", icon: "📋", label: "Reports" },
    { id: "trends", icon: "📈", label: "Trends" },
    { id: "insights", icon: "💡", label: "Insights" },
    { id: "exercises", icon: "🏃", label: "Exercises" },
    { id: "diet", icon: "🥗", label: "Diet & Lifestyle" },
    { id: "faq", icon: "❓", label: "FAQ" },
  ];

  return (
    <div style={{
      width: 240, background: COLORS.primary, minHeight: "100vh", padding: "0",
      display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0,
      zIndex: 100
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
          🏥 Family Health<br />
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>Insights India</span>
        </div>
      </div>

      {/* Member selector */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Viewing</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {FAMILY_MEMBERS.map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
              background: selectedMember === m.id ? "rgba(255,255,255,0.15)" : "transparent",
              color: "#fff", fontFamily: "inherit", transition: "all 0.2s"
            }}>
              <span style={{ fontSize: 20 }}>{m.avatar}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name.split(" ")[0]}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{m.relationship} · {m.age}yr</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: m.risk === "high" ? "#EF4444" : m.risk === "moderate" ? "#F59E0B" : "#10B981"
                }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: "12px 16px", flex: 1, overflowY: "auto" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
            borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
            background: page === item.id ? "rgba(255,255,255,0.15)" : "transparent",
            color: page === item.id ? "#fff" : "rgba(255,255,255,0.65)",
            fontFamily: "inherit", fontSize: 14, fontWeight: page === item.id ? 700 : 500,
            marginBottom: 2, transition: "all 0.2s",
            borderLeft: page === item.id ? `3px solid ${COLORS.accent}` : "3px solid transparent"
          }}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{user?.name?.split(" ")[0]}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Premium Plan</div>
        </div>
      </div>
    </div>
  );
}

// DASHBOARD PAGE
function DashboardPage({ selectedMember }) {
  const member = FAMILY_MEMBERS.find(m => m.id === selectedMember) || FAMILY_MEMBERS[0];
  const reports = REPORTS[selectedMember] || [];
  const latestReport = reports[0];
  const insights = HEALTH_INSIGHTS[selectedMember] || [];

  const summaryStats = latestReport ? {
    total: latestReport.metrics.length,
    high: latestReport.metrics.filter(m => m.status === "high").length,
    low: latestReport.metrics.filter(m => m.status === "low").length,
    normal: latestReport.metrics.filter(m => m.status === "normal").length,
  } : null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 42 }}>{member.avatar}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, fontFamily: "'Playfair Display', serif", color: COLORS.text }}>
              Good morning, {member.name.split(" ")[0]}! 👋
            </h1>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>
              {member.age} years · {member.gender} · {member.diet} · {member.relationship}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summaryStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Tests Done", value: summaryStats.total, icon: "🧪", color: "#3B82F6" },
            { label: "High Values", value: summaryStats.high, icon: "⚠️", color: COLORS.danger },
            { label: "Low Values", value: summaryStats.low, icon: "📉", color: COLORS.warning },
            { label: "Normal", value: summaryStats.normal, icon: "✅", color: COLORS.success },
          ].map((s, i) => (
            <Card key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Latest report */}
        {latestReport ? (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📋 Latest Report</h3>
              <span style={{ fontSize: 12, color: COLORS.muted }}>{latestReport.date}</span>
            </div>
            <div style={{ padding: "10px 14px", background: "#F8F7F2", borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{latestReport.lab}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{latestReport.type}</div>
            </div>
            {latestReport.metrics.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "1px solid #F3F4F6" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m.value} {m.unit}</span>
                  <Badge status={m.status} />
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No Reports Yet</div>
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center" }}>Upload a medical report to see health insights for {member.name.split(" ")[0]}</div>
          </Card>
        )}

        {/* Health insights */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>💡 Focus Areas</h3>
          {insights.length > 0 ? insights.slice(0, 3).map((ins, i) => (
            <div key={i} style={{
              padding: "12px 14px", borderRadius: 12, marginBottom: 10,
              background: ins.severity === "high" ? "#FEF2F2" : ins.severity === "medium" ? "#FFFBEB" : "#F0FDF4",
              borderLeft: `4px solid ${ins.severity === "high" ? COLORS.danger : ins.severity === "medium" ? COLORS.warning : COLORS.success}`
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{ins.icon} {ins.area}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{ins.tip.slice(0, 120)}...</div>
            </div>
          )) : (
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
              Upload reports to generate personalized insights
            </div>
          )}
        </Card>
      </div>

      {/* Quick trend chart */}
      {selectedMember === 1 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>📈 Cholesterol Trend</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <TrendIndicator data={TREND_DATA.cholesterol} />
            <span style={{ fontSize: 12, color: COLORS.muted }}>3 reports · Jan 2024 – Jan 2025</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={TREND_DATA.cholesterol}>
              <defs>
                <linearGradient id="colorCholesterol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[180, 250]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} mg/dL`, "Total Cholesterol"]} />
              <Area type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={3} fill="url(#colorCholesterol)" dot={{ r: 5, fill: COLORS.primary }} />
              <Line type="monotone" dataKey={() => 200} stroke={COLORS.danger} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "right", marginTop: 4 }}>— Red dashed line = target (&lt;200 mg/dL)</p>
        </Card>
      )}

      {/* Top exercise */}
      <Card style={{ marginTop: 20, background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.primaryLight}10)`, border: `1px solid ${COLORS.primary}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>🏃 Top Exercise for You Today</h3>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>Based on your latest cholesterol & glucose levels</p>
          </div>
          <span style={{ background: COLORS.primary, color: "#fff", padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>Personalized</span>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          {[
            { name: "Brisk Walking", icon: "🚶", duration: "30 min", note: "Post-dinner walk" },
            { name: "Surya Namaskar", icon: "🙏", duration: "15 min", note: "Morning practice" },
            { name: "Yoga – Pranayama", icon: "🧘", duration: "20 min", note: "Stress reduction" },
          ].map((ex, i) => (
            <div key={i} style={{
              flex: 1, padding: "14px", background: "#fff", borderRadius: 12,
              textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{ex.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{ex.name}</div>
              <div style={{ color: COLORS.primary, fontWeight: 700, fontSize: 12 }}>{ex.duration}</div>
              <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>{ex.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// FAMILY PAGE
function FamilyPage({ selectedMember, setSelectedMember }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newRelation, setNewRelation] = useState("Spouse");
  const [newDiet, setNewDiet] = useState("veg");
  const [newGender, setNewGender] = useState("Female");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>👨‍👩‍👧‍👦 Family Members</h1>
          <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Manage health profiles for your family</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: "10px 20px", background: COLORS.primary, color: "#fff",
          border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit"
        }}>+ Add Member</button>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 24, border: `2px solid ${COLORS.primary}20` }}>
          <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>Add Family Member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Full Name", val: newName, set: setNewName, placeholder: "e.g. Priya Sharma" },
              { label: "Age", val: newAge, set: setNewAge, placeholder: "e.g. 38", type: "number" },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type || "text"}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              </div>
            ))}
            {[
              { label: "Relationship", val: newRelation, set: setNewRelation, options: ["Spouse", "Son", "Daughter", "Father", "Mother", "Sibling", "Other"] },
              { label: "Gender", val: newGender, set: setNewGender, options: ["Male", "Female", "Other"] },
              { label: "Dietary Preference", val: newDiet, set: setNewDiet, options: ["veg", "non-veg", "eggetarian", "jain", "vegan"] },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 4 }}>{f.label}</label>
                <select value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", background: "#fff" }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ padding: "10px 24px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Add Member
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "10px 24px", background: "#F3F4F6", color: COLORS.text, border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {FAMILY_MEMBERS.map(m => (
          <Card key={m.id} onClick={() => setSelectedMember(m.id)}
            style={{ border: selectedMember === m.id ? `2px solid ${COLORS.primary}` : "2px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLORS.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                {m.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800 }}>{m.name}</h3>
                    <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>{m.relationship} · {m.age} years · {m.gender}</p>
                  </div>
                  <div style={{
                    padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: m.risk === "high" ? "#FEE2E2" : m.risk === "moderate" ? "#FEF3C7" : "#D1FAE5",
                    color: m.risk === "high" ? "#991B1B" : m.risk === "moderate" ? "#92400E" : "#065F46"
                  }}>
                    {m.risk === "high" ? "⚠️ High Risk" : m.risk === "moderate" ? "⚡ Moderate" : "✅ Low Risk"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <span style={{ background: "#F3F4F6", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>🥗 {m.diet}</span>
                  <span style={{ background: "#F3F4F6", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    📋 {(REPORTS[m.id] || []).length} reports
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// REPORTS PAGE
function ReportsPage({ selectedMember }) {
  const member = FAMILY_MEMBERS.find(m => m.id === selectedMember) || FAMILY_MEMBERS[0];
  const reports = REPORTS[selectedMember] || [];
  const [uploadState, setUploadState] = useState("idle"); // idle | uploading | extracting | done
  const [selectedReport, setSelectedReport] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = () => {
    setUploadState("uploading");
    setTimeout(() => setUploadState("extracting"), 1500);
    setTimeout(() => setUploadState("done"), 4000);
    setTimeout(() => setUploadState("idle"), 5500);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>📋 Medical Reports</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Viewing reports for {member.name}</p>
      </div>

      {/* Upload zone */}
      <Card style={{ marginBottom: 28, border: `2px dashed ${dragOver ? COLORS.primary : "#D1D5DB"}`, background: dragOver ? "#F0FDF4" : "#fff" }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {uploadState === "uploading" ? "⏳" : uploadState === "extracting" ? "🤖" : uploadState === "done" ? "✅" : "📤"}
          </div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>
            {uploadState === "uploading" ? "Uploading Report..." :
              uploadState === "extracting" ? "AI Extracting Data..." :
                uploadState === "done" ? "Report Processed Successfully!" :
                  "Upload Medical Report"}
          </h3>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 16px" }}>
            {uploadState === "idle" ? "Supports PDF/Image from Thyrocare, Dr Lal, Metropolis, or any lab" :
              uploadState === "uploading" ? "Encrypting and securely uploading..." :
                uploadState === "extracting" ? "OCR + AI parsing CBC, Lipid Profile, LFT, KFT values..." :
                  "All values extracted and stored securely"}
          </p>

          {uploadState === "idle" && (
            <div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
                {["Thyrocare", "Dr Lal PathLabs", "Metropolis", "Generic"].map(lab => (
                  <span key={lab} style={{ background: "#F3F4F6", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{lab}</span>
                ))}
              </div>
              <button onClick={handleUpload} style={{
                padding: "12px 32px", background: COLORS.primary, color: "#fff",
                border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 15, fontFamily: "inherit"
              }}>📎 Choose File or Drop Here</button>
            </div>
          )}

          {uploadState === "extracting" && (
            <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "16px", margin: "0 auto", maxWidth: 400 }}>
              {["Detecting lab format...", "Extracting test names & values...", "Identifying reference ranges...", "Flagging abnormal results..."].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 13 }}>
                  <span style={{ color: COLORS.success }}>✓</span>
                  <span style={{ color: COLORS.text }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Reports list */}
      {reports.length > 0 ? (
        <div style={{ display: "grid", gap: 20 }}>
          {reports.map(report => (
            <Card key={report.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{report.lab}</h3>
                  <p style={{ margin: "2px 0 0", color: COLORS.muted, fontSize: 13 }}>{report.type} · {report.date}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                    background: report.metrics.some(m => m.status === "high" || m.status === "low") ? "#FEF3C7" : "#D1FAE5",
                    color: report.metrics.some(m => m.status === "high" || m.status === "low") ? "#92400E" : "#065F46"
                  }}>
                    {report.metrics.filter(m => m.status !== "normal").length} flags
                  </span>
                  <button onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                    style={{ padding: "6px 16px", border: "none", borderRadius: 10, background: "#F3F4F6", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    {selectedReport === report.id ? "Collapse" : "View All"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {(selectedReport === report.id ? report.metrics : report.metrics.slice(0, 4)).map((m, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: 10,
                    background: m.status === "high" ? "#FEF2F2" : m.status === "low" ? "#FFFBEB" : "#F9FAFB"
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                      <span style={{ color: COLORS.muted, fontSize: 12, marginLeft: 8 }}>ref: {m.ref}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{m.value}</span>
                      <span style={{ color: COLORS.muted, fontSize: 12 }}>{m.unit}</span>
                      <Badge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>No reports uploaded yet</h3>
          <p style={{ color: COLORS.muted, fontSize: 14 }}>Upload your first report above to get started</p>
        </Card>
      )}
    </div>
  );
}

// TRENDS PAGE
function TrendsPage({ selectedMember }) {
  const [activeTrend, setActiveTrend] = useState("cholesterol");

  const trendOptions = [
    { key: "cholesterol", label: "Cholesterol", unit: "mg/dL", target: 200, data: TREND_DATA.cholesterol },
    { key: "ldl", label: "LDL", unit: "mg/dL", target: 130, data: TREND_DATA.ldl },
    { key: "glucose", label: "Blood Glucose", unit: "mg/dL", target: 100, data: TREND_DATA.glucose },
    { key: "hba1c", label: "HbA1c", unit: "%", target: 5.7, data: TREND_DATA.hba1c },
    { key: "vitD", label: "Vitamin D", unit: "ng/mL", target: 30, data: TREND_DATA.vitD },
  ];

  const current = trendOptions.find(t => t.key === activeTrend);
  const data = current.data;
  const first = data[0].value, last = data[data.length - 1].value;
  const change = ((last - first) / first * 100).toFixed(1);
  const improving = activeTrend === "vitD" ? last > first : last < first;

  if (selectedMember !== 1) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📈 Health Trends</h1>
        <Card style={{ textAlign: "center", padding: "60px 20px", marginTop: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>Multiple reports needed</h3>
          <p style={{ color: COLORS.muted, fontSize: 14 }}>Trends require at least 2 uploaded reports for this family member.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>📈 Health Trends</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Track your metrics over time across reports</p>
      </div>

      {/* Metric selector */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {trendOptions.map(t => (
          <Pill key={t.key} active={activeTrend === t.key} onClick={() => setActiveTrend(t.key)}>{t.label}</Pill>
        ))}
      </div>

      {/* Trend summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Latest Value</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>{last}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>{current.unit}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Change</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: improving ? COLORS.success : COLORS.danger, fontFamily: "'Playfair Display', serif" }}>
            {change > 0 ? "+" : ""}{change}%
          </div>
          <div style={{ fontSize: 12, color: improving ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
            {improving ? "↘ Improving" : "↗ Worsening"}
          </div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Target</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>{current.target}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>{current.unit}</div>
        </Card>
      </div>

      {/* Main trend chart */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16 }}>
          {current.label} Over Time
          <span style={{ marginLeft: 12, fontSize: 12, color: improving ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
            {improving ? "📉 Improving trend" : "📈 Needs attention"}
          </span>
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={improving ? COLORS.success : COLORS.primary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={improving ? COLORS.success : COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => [`${v} ${current.unit}`, current.label]}
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
            />
            <Area type="monotone" dataKey="value"
              stroke={improving ? COLORS.success : COLORS.primary}
              strokeWidth={3} fill="url(#trendGrad)"
              dot={{ r: 6, fill: improving ? COLORS.success : COLORS.primary, strokeWidth: 2, stroke: "#fff" }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* All trends overview */}
      <Card>
        <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16 }}>All Metrics at a Glance</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {trendOptions.map(t => {
            const f = t.data[0].value, l = t.data[t.data.length - 1].value;
            const pct = ((l - f) / f * 100).toFixed(1);
            const imp = t.key === "vitD" ? l > f : l < f;
            const atTarget = t.key === "vitD" ? l >= t.target : l <= t.target;
            return (
              <div key={t.key} style={{
                display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
                borderRadius: 12, background: "#F9FAFB",
                cursor: "pointer", transition: "background 0.2s"
              }} onClick={() => setActiveTrend(t.key)}>
                <div style={{ width: 100, fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 6, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${Math.min(100, (l / (t.target * 1.5)) * 100)}%`,
                      background: atTarget ? COLORS.success : imp ? COLORS.warning : COLORS.danger
                    }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, width: 160, justifyContent: "flex-end" }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{l} <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.muted }}>{t.unit}</span></span>
                  <span style={{ color: imp ? COLORS.success : COLORS.danger, fontSize: 12, fontWeight: 700 }}>
                    {pct > 0 ? "+" : ""}{pct}%
                  </span>
                  <span style={{ fontSize: 18 }}>{atTarget ? "✅" : imp ? "📈" : "⚠️"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// INSIGHTS PAGE
function InsightsPage({ selectedMember }) {
  const member = FAMILY_MEMBERS.find(m => m.id === selectedMember) || FAMILY_MEMBERS[0];
  const insights = HEALTH_INSIGHTS[selectedMember] || [];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>💡 Health Insights</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Personalized focus areas for {member.name}</p>
      </div>

      {/* Disclaimer */}
      <Card style={{ marginBottom: 24, background: "#FFFBEB", border: "1px solid #FCD34D" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
          <strong>⚠️ Important Disclaimer:</strong> These insights are for educational purposes only and are not medical diagnoses. Always consult a qualified doctor before making health decisions. This AI-powered tool may make errors and is not intended for medical emergencies.
        </p>
      </Card>

      {insights.length > 0 ? (
        <div style={{ display: "grid", gap: 20 }}>
          {insights.map((ins, i) => (
            <Card key={i} style={{
              borderLeft: `6px solid ${ins.severity === "high" ? COLORS.danger : ins.severity === "medium" ? COLORS.warning : COLORS.success}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{ins.icon} {ins.area}</h3>
                <span style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                  background: ins.severity === "high" ? "#FEE2E2" : ins.severity === "medium" ? "#FEF3C7" : "#D1FAE5",
                  color: ins.severity === "high" ? "#991B1B" : ins.severity === "medium" ? "#92400E" : "#065F46"
                }}>
                  {ins.severity === "high" ? "High Priority" : ins.severity === "medium" ? "Watch" : "Maintain"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: COLORS.text }}>{ins.tip}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>No insights yet</h3>
          <p style={{ color: COLORS.muted, fontSize: 14 }}>Upload reports to generate personalized health insights for {member.name.split(" ")[0]}</p>
        </Card>
      )}

      {/* Radar chart */}
      {selectedMember === 1 && (
        <Card style={{ marginTop: 24 }}>
          <h3 style={{ margin: "0 0 20px", fontWeight: 800 }}>Health Score Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={[
              { subject: "Cholesterol", score: 55 },
              { subject: "Blood Sugar", score: 60 },
              { subject: "Haemoglobin", score: 70 },
              { subject: "Vitamin D", score: 40 },
              { subject: "Thyroid", score: 90 },
              { subject: "Vitamin B12", score: 80 },
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <Radar name="Health Score" dataKey="score" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ textAlign: "center", fontSize: 12, color: COLORS.muted, margin: "8px 0 0" }}>
            Score out of 100 — higher is better
          </p>
        </Card>
      )}
    </div>
  );
}

// EXERCISES PAGE
function ExercisesPage({ selectedMember }) {
  const [activeCondition, setActiveCondition] = useState("diabetes");
  const conditions = [
    { key: "diabetes", label: "Diabetes Risk", icon: "🩸" },
    { key: "heart", label: "Heart Health", icon: "❤️" },
    { key: "obesity", label: "Obesity", icon: "⚖️" },
    { key: "hypertension", label: "Hypertension", icon: "🫀" },
    { key: "back", label: "Back Pain", icon: "🦴" },
    { key: "joint", label: "Joint / Arthritis", icon: "🦵" },
    { key: "fattyLiver", label: "Fatty Liver", icon: "🫁" },
    { key: "stress", label: "Stress / Anxiety", icon: "🧠" },
  ];

  const exercises = EXERCISES[activeCondition] || EXERCISES.diabetes;

  const difficultyColor = { Easy: COLORS.success, Medium: COLORS.warning, Hard: COLORS.danger };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>🏃 Exercise Module</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Condition-specific exercises suited for Indian lifestyle</p>
      </div>

      {/* Personalized recommendation banner */}
      {selectedMember === 1 && (
        <Card style={{ marginBottom: 24, background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.accent}10)`, border: `1px solid ${COLORS.primary}20` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>🎯</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Recommended for you based on latest report</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Your HbA1c and glucose indicate diabetes risk → prioritize Diabetes & Heart exercises</div>
            </div>
            <button onClick={() => setActiveCondition("diabetes")} style={{
              marginLeft: "auto", padding: "8px 20px", background: COLORS.primary, color: "#fff",
              border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap"
            }}>View Plan</button>
          </div>
        </Card>
      )}

      {/* Condition tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {conditions.map(c => (
          <button key={c.key} onClick={() => setActiveCondition(c.key)} style={{
            padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer",
            background: activeCondition === c.key ? COLORS.primary : "#F3F4F6",
            color: activeCondition === c.key ? "#fff" : COLORS.text,
            fontWeight: 700, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s"
          }}>{c.icon} {c.label}</button>
        ))}
      </div>

      {/* Exercise cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {exercises.map((ex, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{ex.name}</h3>
              <span style={{
                padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: `${difficultyColor[ex.difficulty]}20`,
                color: difficultyColor[ex.difficulty]
              }}>{ex.difficulty}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ padding: "8px", background: "#F9FAFB", borderRadius: 8, fontSize: 12 }}>
                <div style={{ color: COLORS.muted, fontWeight: 600 }}>Duration</div>
                <div style={{ fontWeight: 800, color: COLORS.primary }}>{ex.duration}</div>
              </div>
              <div style={{ padding: "8px", background: "#F9FAFB", borderRadius: 8, fontSize: 12 }}>
                <div style={{ color: COLORS.muted, fontWeight: 600 }}>Target</div>
                <div style={{ fontWeight: 800 }}>{ex.muscles}</div>
              </div>
            </div>
            <div style={{ padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, fontSize: 12, color: "#065F46", marginBottom: 12 }}>
              🇮🇳 {ex.suitability}
            </div>
            <a href={ex.youtube} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
              color: "#FF0000", textDecoration: "none"
            }}>
              ▶ Watch on YouTube
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}

// DIET PAGE
function DietPage({ selectedMember }) {
  const member = FAMILY_MEMBERS.find(m => m.id === selectedMember) || FAMILY_MEMBERS[0];

  const dietTips = {
    veg: [
      { icon: "🫘", tip: "Include dal, rajma, chana — excellent protein and fibre sources for vegetarians." },
      { icon: "🥗", tip: "Eat 2–3 servings of vegetables daily. Leafy greens like spinach, methi are iron-rich." },
      { icon: "🌾", tip: "Replace white rice with millets like ragi, jowar, or bajra for better glycemic control." },
      { icon: "🥜", tip: "Add a small handful of mixed nuts (almonds, walnuts) as a daily snack." },
    ],
    "non-veg": [
      { icon: "🐟", tip: "Include fatty fish (rohu, hilsa) twice a week for heart-healthy omega-3 fatty acids." },
      { icon: "🍗", tip: "Choose grilled or tandoor chicken over fried preparations." },
      { icon: "🥚", tip: "Eggs are excellent — the yolk contains Vitamin D and choline, especially important if deficient." },
      { icon: "🥗", tip: "Pair every non-veg meal with a salad or vegetable side for fibre and antioxidants." },
    ],
    jain: [
      { icon: "🫘", tip: "Toor, moong, and masoor dals are excellent protein sources without root vegetables." },
      { icon: "🥛", tip: "Full-fat dairy like paneer and curd are core protein sources in Jain diet." },
      { icon: "🌰", tip: "Nuts, seeds, and dry fruits provide healthy fats and micronutrients." },
      { icon: "🍯", tip: "Consider spirulina supplements for vitamin B12 in strict Jain diets." },
    ],
  };

  const tips = dietTips[member.diet] || dietTips.veg;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>🥗 Diet & Lifestyle</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Personalized for {member.name.split(" ")[0]}'s {member.diet} diet</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Diet tips */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>🍽️ Diet Recommendations</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", background: "#F0FDF4", borderRadius: 10 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>Customized for {member.diet} diet preference</span>
          </div>
          {tips.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < tips.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: COLORS.text }}>{t.tip}</p>
            </div>
          ))}
        </Card>

        {/* Lifestyle habits */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>🌅 Daily Lifestyle Habits</h3>
          {[
            { time: "6:00 AM", habit: "Warm water with lemon + methi seeds water", icon: "🌅" },
            { time: "7:00 AM", habit: "15 min Surya Namaskar or brisk walk", icon: "🧘" },
            { time: "8:00 AM", habit: "High-protein breakfast: eggs/dal/paneer with multigrain", icon: "🍳" },
            { time: "1:00 PM", habit: "Balanced lunch, 20 min gap before eating", icon: "🍱" },
            { time: "6:00 PM", habit: "Light snack: chana, fruit, or nuts", icon: "🥜" },
            { time: "7:30 PM", habit: "30-min evening walk before sunset", icon: "🚶" },
            { time: "8:00 PM", habit: "Early, light dinner — avoid rice/carbs", icon: "🌙" },
            { time: "10:00 PM", habit: "Screen-free wind-down, 7–8 hrs sleep target", icon: "😴" },
          ].map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 7 ? "1px solid #F3F4F6" : "none" }}>
              <span style={{ fontSize: 16, width: 20 }}>{h.icon}</span>
              <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 700, width: 55 }}>{h.time}</span>
              <span style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.4 }}>{h.habit}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Sleep & Stress */}
      <Card>
        <h3 style={{ margin: "0 0 20px", fontWeight: 800 }}>😴 Sleep & Stress Management</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: "😴", title: "Sleep Hygiene", tips: ["7–9 hours for adults under 50", "Sleep before 11 PM — aligns with Indian lifestyle", "Avoid screens 1 hr before bed", "Magnesium-rich foods (nuts, seeds) help sleep"] },
            { icon: "🧠", title: "Stress Control", tips: ["Daily 10-min pranayama (Anulom Vilom)", "Journaling or gratitude practice", "Social connection — family meals matter", "Nature walks in parks or green spaces"] },
            { icon: "🩺", title: "Preventive Checkups", tips: ["Annual full-body checkup from age 30+", "6-monthly lipid & glucose checks if at risk", "Ophthalmology check every 2 years", "Dental checkup every 6 months"] },
          ].map((s, i) => (
            <div key={i} style={{ padding: "16px", background: "#F9FAFB", borderRadius: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{s.icon}</div>
              <h4 style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 14 }}>{s.title}</h4>
              {s.tips.map((t, j) => (
                <div key={j} style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 4, display: "flex", gap: 6 }}>
                  <span style={{ color: COLORS.primary, flexShrink: 0 }}>→</span> {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// FAQ PAGE
function FAQPage() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800 }}>❓ Health FAQ</h1>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>Common health questions for Indian families</p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {FAQS.map((f, i) => (
          <Card key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)}
            style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.topic}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{f.q}</div>
                </div>
              </div>
              <span style={{ fontSize: 20, color: COLORS.muted, flexShrink: 0 }}>{openIdx === i ? "▲" : "▼"}</span>
            </div>
            {openIdx === i && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F3F4F6" }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: COLORS.text }}>{f.a}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Disclaimer */}
      <Card style={{ marginTop: 28, background: "#FEF2F2", border: "1px solid #FECACA" }}>
        <h3 style={{ margin: "0 0 12px", color: "#991B1B", fontWeight: 800 }}>⚠️ Medical Disclaimer</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            "This app is NOT a substitute for professional medical advice, diagnosis, or treatment.",
            "Always consult a qualified doctor or healthcare provider for any medical concerns.",
            "Information provided is for educational purposes only.",
            "AI-powered insights may contain errors — please verify with a medical professional.",
            "This platform is NOT suitable for medical emergencies — call 108 or visit the nearest hospital.",
          ].map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "#991B1B" }}>
              <span>•</span><span>{d}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedMember, setSelectedMember] = useState(1);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const pageComponents = {
    dashboard: <DashboardPage selectedMember={selectedMember} />,
    family: <FamilyPage selectedMember={selectedMember} setSelectedMember={setSelectedMember} />,
    reports: <ReportsPage selectedMember={selectedMember} />,
    trends: <TrendsPage selectedMember={selectedMember} />,
    insights: <InsightsPage selectedMember={selectedMember} />,
    exercises: <ExercisesPage selectedMember={selectedMember} />,
    diet: <DietPage selectedMember={selectedMember} />,
    faq: <FAQPage />,
  };

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: COLORS.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${COLORS.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 99px; }
        button, select, input { font-family: 'Nunito', sans-serif; }
      `}</style>

      {/* Sidebar */}
      <Sidebar page={page} setPage={setPage} user={user} selectedMember={selectedMember} setSelectedMember={setSelectedMember} />

      {/* Main content */}
      <div style={{ marginLeft: 240, padding: "32px", minHeight: "100vh" }}>
        <div style={{ maxWidth: 980 }}>
          {pageComponents[page]}
        </div>
      </div>
    </div>
  );
}
