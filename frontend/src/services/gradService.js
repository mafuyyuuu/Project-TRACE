import api from '@/services/api'

/**
 * Graduate Application module. The form is admin-configurable, so the UI
 * renders whatever `getFormFields` returns rather than a fixed layout.
 */

/** Field definitions the form renders from. */
export async function getFormFields() {
  const { data } = await api.get('/grad-applications/form-fields')
  return data
}

/**
 * @param {Object} answers keyed by field_key
 */
export async function submitApplication(answers) {
  const { data } = await api.post('/grad-applications', { answers })
  return data
}

/** The signed-in student's own submissions. */
export async function getMyApplications() {
  const { data } = await api.get('/grad-applications/mine')
  return data
}

/** Staff review queue. */
export async function getApplications(status) {
  const { data } = await api.get('/grad-applications', { params: status ? { status } : {} })
  return data
}

export async function getApplication(id) {
  const { data } = await api.get(`/grad-applications/${id}`)
  return data
}

/**
 * @param {string} status one of 'under_review' | 'approved' | 'rejected'
 */
export async function reviewApplication(id, status, notes) {
  const { data } = await api.post(`/grad-applications/${id}/review`, { status, notes })
  return data
}
