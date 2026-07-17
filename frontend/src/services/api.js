import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: attach Bearer token ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trace_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: handle 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('trace_token')
      localStorage.removeItem('trace_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// ── API Helper Functions ──────────────────────────────────

/**
 * Authenticate a user with employee credentials.
 * @param {{ employeeId: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function login(credentials) {
  const { data } = await api.post('/auth/login', {
    employee_id: credentials.employeeId,
    password: credentials.password,
  })
  return data
}

export async function register(formData) {
  const { data } = await api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Upload a document with associated metadata.
 * @param {FormData} formData - Must contain `file`, `documentType`, `studentId`, `studentName`
 * @returns {Promise<{ trackingNumber: string, document: object }>}
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
 * Get the authenticated user's profile.
 * @returns {Promise<object>}
 */
export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

/**
 * Process a document (approve or reject).
 * @param {string} id 
 * @param {string} action - 'approve' or 'reject'
 * @returns {Promise<object>}
 */
export async function processDocument(id, action) {
  const { data } = await api.post(`/documents/${id}/action`, { action })
  return data
}

/**
 * Submit manual GCash payment for a document.
 * @param {string} id
 * @param {FormData} formData - Contains `gcash_reference_no` and `receipt` image
 */
export async function submitPayment(id, formData) {
  const { data } = await api.post(`/documents/${id}/submit-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

/**
 * Verify GCash payment (Finance Clerk).
 * @param {string} id
 * @param {string} action - 'approve' or 'reject'
 * @param {string} notes
 */
export async function verifyPayment(id, formData) {
  const { data } = await api.post(`/documents/${id}/verify-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

/**
 * Evaluate and route OCR extraction (Secretary).
 * @param {string} id
 * @param {{ student_id: string, student_name: string, document_type: string, action: string, notes: string }} payload
 */
export async function evaluateDocument(id, payload) {
  const { data } = await api.post(`/documents/${id}/evaluate`, payload)
  return data
}

/**
 * Release document (Window 1 Clerk).
 * @param {string} id
 */
export async function releaseDocument(id) {
  const { data } = await api.post(`/documents/${id}/release`)
  return data
}

/**
 * Get pending student accounts (Admin).
 */
export async function getPendingStudents() {
  const { data } = await api.get('/auth/pending-students')
  return data
}

/**
 * Verify or reject pending student registration (Admin).
 * @param {string} userId
 * @param {string} action - 'verify' or 'reject'
 */
export async function verifyStudent(userId, action) {
  const { data } = await api.post(`/auth/verify-student/${userId}`, { action })
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

export const updateProfile = async (data) => {
  const res = await api.put('/auth/profile', data);
  return res.data;
};

export const getNotifications = async () => {
  const res = await api.get('/auth/notifications');
  return res.data;
};

export const markNotificationsRead = async () => {
  const res = await api.put('/auth/notifications/read');
  return res.data;
};

/**
 * Look up a student by student ID.
 * @param {string} studentId
 */
export async function lookupStudent(studentId) {
  const { data } = await api.get(`/auth/student/${studentId}`)
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

export default api
