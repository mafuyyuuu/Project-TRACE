import api from '@/services/api'

/** Account, profile, notification, and admin user-governance API calls. */

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
 * Get the authenticated user's profile.
 * @returns {Promise<object>}
 */
export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export const updateProfile = async (payload) => {
  const res = await api.put('/auth/profile', payload)
  return res.data
}

export const getNotifications = async () => {
  const res = await api.get('/auth/notifications')
  return res.data
}

export const markNotificationsRead = async () => {
  const res = await api.put('/auth/notifications/read')
  return res.data
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
 * List every registered account (Admin → Registered Users tab).
 */
export async function getUsers() {
  const { data } = await api.get('/auth/users')
  return data
}

/**
 * Look up a student by student ID.
 * @param {string} studentId
 */
export async function lookupStudent(studentId) {
  const { data } = await api.get(`/auth/student/${studentId}`)
  return data
}
