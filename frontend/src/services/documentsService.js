import api from '@/services/api'

/** Document pipeline, payment, and dashboard-analytics API calls. */

/**
 * Upload a document with associated metadata.
 * @param {FormData} formData - Must contain `document`, `document_type`, `student_id`, `student_name`
 * @returns {Promise<{ tracking_number: string, document: object }>}
 */
export async function uploadDocument(formData) {
  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Fetch all documents for the current user.
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */
export async function getDocuments(page = 1, limit = 5) {
  const { data } = await api.get(`/documents?page=${page}&limit=${limit}`)
  return data
}

/**
 * Fetch a single document by tracking number.
 * @param {string} trackingNumber
 * @returns {Promise<object>}
 */
export async function getDocumentByTracking(trackingNumber) {
  const { data } = await api.get(`/documents/${trackingNumber}`)
  return data
}

/**
 * Window 1 intake: clear the paperwork through to the College Secretary, or
 * return it to the student with notes.
 * @param {string} id
 * @param {FormData} formData - Contains `action` ('approve' | 'return'), `notes`,
 *   and optionally a `document` scan taken at the counter
 */
export async function intakeDocument(id, formData) {
  const { data } = await api.post(`/documents/${id}/intake`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * College Secretary accepts a request for processing, committing to a date.
 * @param {string} id
 * @param {object} payload - `action` ('approve' | 'reject'), `estimated_ready_date`,
 *   `notes`, and any OCR corrections
 */
export async function acceptForProcessing(id, payload) {
  const { data } = await api.post(`/documents/${id}/accept`, payload)
  return data
}

/**
 * College Secretary prices a printed document. The request is only billed once
 * every document in it has a price.
 * @param {string} id
 * @param {object} payload - `amount`, `page_count`, `pricing_notes`
 */
export async function priceDocument(id, payload) {
  const { data } = await api.post(`/documents/${id}/price`, payload)
  return data
}

/**
 * College Secretary checks the Official Receipt Finance attached before the
 * printed document can be handed to Window 1.
 * @param {string} id
 * @param {object} payload - optional `notes`
 */
export async function verifyOfficialReceipt(id, payload = {}) {
  const { data } = await api.post(`/documents/${id}/verify-or`, payload)
  return data
}

/**
 * College Secretary confirms the printed document has physically reached
 * Window 1.
 * @param {string} id
 * @param {object} payload - optional `notes`
 */
export async function confirmHandoff(id, payload = {}) {
  const { data } = await api.post(`/documents/${id}/handoff`, payload)
  return data
}

/**
 * Read an Official Receipt so the walk-in form can be pre-filled. Records
 * nothing — the clerk confirms every field before saving.
 * @param {FormData} formData - Contains a `receipt` image
 * @returns {Promise<{ success: boolean, message: string, extracted_data: object }>}
 */
export async function scanReceipt(formData) {
  const { data } = await api.post('/documents/scan-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Finance logs a payment taken at the counter.
 * @param {string} id
 * @param {FormData} formData - Contains `or_number`, `or_date`, `notes`,
 *   and optionally the scanned `officialReceipt`
 */
export async function logWalkInPayment(id, formData) {
  const { data } = await api.post(`/documents/${id}/log-walkin-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Submit manual GCash payment for a document.
 * @param {string} id
 * @param {FormData} formData - Contains `gcash_reference_no` and `receipt` image
 */
export async function submitPayment(id, formData) {
  const { data } = await api.post(`/documents/${id}/submit-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Verify GCash payment (Finance Clerk).
 * @param {string} id
 * @param {FormData} formData - Contains `action`, `notes`, `or_number` (required to approve),
 *   optional `officialReceipt`
 */
export async function verifyPayment(id, formData) {
  const { data } = await api.post(`/documents/${id}/verify-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Release document (Window 1 Clerk).
 * @param {string} id
 */
export async function releaseDocument(id, payload = {}) {
  const { data } = await api.post(`/documents/${id}/release`, payload)
  return data
}

/**
 * Cancel an unpaid document request (Student).
 * @param {string} id
 */
export async function cancelDocument(id) {
  const { data } = await api.delete(`/documents/${id}`)
  return data
}

/**
 * Get dashboard KPI stats.
 */
export async function getDashboardStats() {
  const { data } = await api.get('/documents/stats')
  return data
}

/**
 * Get 7-day volume forecast (Admin).
 */
export async function getForecast() {
  const { data } = await api.get('/documents/stats/forecast')
  return data
}

/**
 * Get AI insights (Admin).
 */
export async function getInsights() {
  const { data } = await api.get('/documents/stats/insights')
  return data
}

/**
 * Global step_logs audit trail (Admin → Activity Logs tab).
 */
export async function getActivityLogs() {
  const { data } = await api.get('/documents/activity-logs')
  return data
}
