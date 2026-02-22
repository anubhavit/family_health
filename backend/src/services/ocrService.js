// src/services/ocrService.js
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const fs = require('fs');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── KNOWN INDIAN LAB FORMATS ─────────────────────────────────
const LAB_SIGNATURES = {
  thyrocare: ['thyrocare', 'aarogyam', 'wellness'],
  dr_lal: ['dr lal pathlabs', 'lal path labs', 'dr. lal'],
  metropolis: ['metropolis', 'metropolis healthcare'],
  srl: ['srl diagnostics', 'srl'],
  apollo: ['apollo diagnostics', 'apollo health'],
};

// ─── STRUCTURED EXTRACTION PROMPT ────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `You are an expert medical report parser specializing in Indian diagnostic lab reports.

Extract ALL test results from the provided text into structured JSON.

For each test result, extract:
- test_name: standardized English name (e.g., "Hemoglobin", "Total Cholesterol", "TSH")
- test_category: one of: CBC, LIPID_PROFILE, LFT, KFT, THYROID, DIABETES, VITAMINS, HORMONES, OTHER
- value: numeric value only (no units)
- unit: unit of measurement (e.g., "g/dL", "mg/dL", "µIU/mL", "ng/mL", "%")
- ref_range_low: lower bound of reference range (numeric, or null)
- ref_range_high: upper bound of reference range (numeric, or null)
- ref_range_text: original reference range string (e.g., "13.5-17.5", ">40", "<200")
- status: "normal", "low", "high", "critical_low", "critical_high"

Also extract:
- lab_name: name of the diagnostic lab
- report_date: date of report (ISO format YYYY-MM-DD)
- patient_name: patient name if visible

Indian lab specifics to handle:
- CBC typically includes: Hemoglobin, WBC, RBC, Platelets, PCV, MCV, MCH, MCHC, Neutrophils, Lymphocytes
- Lipid Profile: Total Cholesterol, LDL, HDL, VLDL, Triglycerides, Non-HDL, LDL/HDL Ratio
- LFT: Bilirubin (Total/Direct/Indirect), SGPT/ALT, SGOT/AST, Alkaline Phosphatase, Total Protein, Albumin, Globulin
- KFT: Blood Urea, Serum Creatinine, BUN, Uric Acid, eGFR
- Thyroid: TSH, T3, T4, Free T3, Free T4
- Diabetes: Fasting Glucose, PP Glucose, HbA1c, Fasting Insulin
- Vitamins: Vitamin D, Vitamin B12, Folate, Iron, Ferritin

Respond ONLY with valid JSON, no markdown, no explanation.
Format: {"lab_name": "...", "report_date": "...", "patient_name": "...", "metrics": [...]}`;

// ─── DETECT LAB FROM TEXT ─────────────────────────────────────
function detectLab(text) {
  const lower = text.toLowerCase();
  for (const [lab, signatures] of Object.entries(LAB_SIGNATURES)) {
    if (signatures.some(s => lower.includes(s))) {
      return lab;
    }
  }
  return 'generic';
}

// ─── EXTRACT TEXT FROM PDF ────────────────────────────────────
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const data = await pdfParse(dataBuffer);
    return { text: data.text, pages: data.numpages };
  } catch (err) {
    logger.warn('PDF parse failed, will try OCR', { error: err.message });
    return null;
  }
}

// ─── EXTRACT TEXT FROM IMAGE VIA TESSERACT ───────────────────
async function extractTextFromImage(filePath) {
  const { data } = await Tesseract.recognize(filePath, 'eng+hin', {
    logger: () => {},
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-/:()%<>μ',
  });
  return { text: data.text, confidence: data.confidence };
}

// ─── COMPUTE STATUS ───────────────────────────────────────────
function computeStatus(value, refLow, refHigh) {
  if (refLow === null && refHigh === null) return 'normal';
  const v = parseFloat(value);
  if (refHigh !== null && v > refHigh * 1.3) return 'critical_high';
  if (refLow !== null && v < refLow * 0.7) return 'critical_low';
  if (refHigh !== null && v > refHigh) return 'high';
  if (refLow !== null && v < refLow) return 'low';
  return 'normal';
}

// ─── AI STRUCTURED EXTRACTION ────────────────────────────────
async function extractWithAI(rawText, isImageFile = false, imageBase64 = null) {
  const startTime = Date.now();

  try {
    let messages;

    if (isImageFile && imageBase64) {
      // Use GPT-4 Vision for image-based reports
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `Extract all test results from this Indian medical lab report. ${EXTRACTION_SYSTEM_PROMPT}`,
            },
          ],
        },
      ];
    } else {
      // Text-based extraction
      messages = [
        {
          role: 'user',
          content: `Extract all test results from this lab report text:\n\n${rawText.slice(0, 12000)}`,
        },
      ];
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
      messages,
      system: EXTRACTION_SYSTEM_PROMPT,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    const processingMs = Date.now() - startTime;

    // Post-process: compute status for each metric
    const metrics = (parsed.metrics || []).map(m => ({
      ...m,
      value: parseFloat(m.value),
      ref_range_low: m.ref_range_low !== null ? parseFloat(m.ref_range_low) : null,
      ref_range_high: m.ref_range_high !== null ? parseFloat(m.ref_range_high) : null,
      status: m.status || computeStatus(m.value, m.ref_range_low, m.ref_range_high),
      deviation_pct: m.ref_range_high
        ? parseFloat(((parseFloat(m.value) - m.ref_range_high) / m.ref_range_high * 100).toFixed(2))
        : null,
    }));

    return {
      success: true,
      labName: parsed.lab_name || 'Unknown Lab',
      reportDate: parsed.report_date || null,
      patientName: parsed.patient_name || null,
      metrics,
      processingMs,
      model: response.model,
    };
  } catch (err) {
    logger.error('AI extraction error', { error: err.message });
    return { success: false, error: err.message, processingMs: Date.now() - startTime };
  }
}

// ─── MAIN PIPELINE ────────────────────────────────────────────
async function processReport(filePath, mimeType) {
  logger.info('Starting OCR pipeline', { filePath, mimeType });

  let rawText = '';
  let ocrConfidence = null;
  let isImage = false;

  if (mimeType === 'application/pdf') {
    const pdfResult = await extractTextFromPDF(filePath);
    if (pdfResult && pdfResult.text.length > 100) {
      rawText = pdfResult.text;
    } else {
      // PDF might be scanned — try OCR
      isImage = true;
      const ocrResult = await extractTextFromImage(filePath);
      rawText = ocrResult.text;
      ocrConfidence = ocrResult.confidence / 100;
    }
  } else if (mimeType.startsWith('image/')) {
    isImage = true;
    const ocrResult = await extractTextFromImage(filePath);
    rawText = ocrResult.text;
    ocrConfidence = ocrResult.confidence / 100;
  }

  if (!rawText || rawText.trim().length < 50) {
    return { success: false, error: 'Could not extract text from file' };
  }

  const detectedLab = detectLab(rawText);
  logger.info('Lab detected', { lab: detectedLab });

  // Read image as base64 for vision model if needed
  let imageBase64 = null;
  if (isImage) {
    imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
  }

  const extraction = await extractWithAI(rawText, isImage, imageBase64);

  return {
    ...extraction,
    rawText,
    detectedLab,
    ocrConfidence,
  };
}

module.exports = { processReport };
