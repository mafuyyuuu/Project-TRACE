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
 * @returns {Promise<Array>}
 */
export async function getDocuments() {
  const { data } = await api.get('/documents')
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

export default api
