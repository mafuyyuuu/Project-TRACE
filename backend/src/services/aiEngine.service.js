const fs = require('fs');
const env = require('../config/env');

/**
 * Client for the Python Flask AI engine (EasyOCR / Prophet / Random Forest).
 *
 * Every call here is best-effort: the engine is an optional local service, and
 * the callers all have fallback behavior, so failures are reported by return
 * value rather than by throwing.
 */

function buildFormData(file, fieldName = 'document') {
  const fileBuffer = fs.readFileSync(file.path);
  const fileBlob = new Blob([fileBuffer], { type: file.mimetype });
  const form = new FormData();
  form.append(fieldName, fileBlob, file.originalname);
  return form;
}

/**
 * 3-point registration verification (school name + student ID + course).
 * Returns { verified, reason } or null when the engine is unreachable.
 */
async function verifyIdDocument(file, { studentId, course }) {
  try {
    const form = buildFormData(file);
    form.append('student_id', studentId);
    if (course) form.append('course', course);

    const res = await fetch(`${env.AI_ENGINE_URL}/ocr/verify`, { method: 'POST', body: form });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('⚠️ AI verification unavailable:', err.message);
    return null;
  }
}

/**
 * Document intake OCR. Returns the engine's payload
 * ({ success, raw_text, extracted_data, confidence }) or null on failure.
 */
async function extractDocument(file, { trackingNumber }) {
  try {
    const form = buildFormData(file);
    form.append('tracking_number', trackingNumber);

    const res = await fetch(`${env.AI_ENGINE_URL}/ocr/extract`, { method: 'POST', body: form });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ OCR engine unavailable or failed for ${trackingNumber}:`, err.message);
    return null;
  }
}

/** Prophet 7-day volume forecast. Returns null when unavailable (caller falls back). */
async function getForecast() {
  try {
    const res = await fetch(`${env.AI_ENGINE_URL}/forecast`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`AI forecast fetch failed at ${env.AI_ENGINE_URL}/forecast:`, err.message);
    return null;
  }
}

/** Random Forest prescriptive insights. Returns null when unavailable. */
async function getInsights() {
  try {
    const res = await fetch(`${env.AI_ENGINE_URL}/ai/recommend`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`AI insights fetch failed at ${env.AI_ENGINE_URL}/ai/recommend:`, err.message);
    return null;
  }
}

module.exports = { verifyIdDocument, extractDocument, getForecast, getInsights };
