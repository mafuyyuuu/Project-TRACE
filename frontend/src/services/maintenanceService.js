import api from '@/services/api'

/**
 * Admin maintenance CRUD for staff, document types and colleges.
 *
 * "Delete" is always a deactivation (`setXActive(id, false)`) — historical
 * documents reference document types by name and users reference colleges by
 * name, so removing a row would orphan records.
 */

// -- Colleges ---------------------------------------------------------------
export async function getColleges() {
  const { data } = await api.get('/maintenance/colleges')
  return data
}
export async function createCollege(payload) {
  const { data } = await api.post('/maintenance/colleges', payload)
  return data
}
export async function updateCollege(id, payload) {
  const { data } = await api.put(`/maintenance/colleges/${id}`, payload)
  return data
}
export async function setCollegeActive(id, isActive) {
  const { data } = await api.patch(`/maintenance/colleges/${id}/active`, { is_active: isActive })
  return data
}

// -- Document types ---------------------------------------------------------
export async function getDocumentTypes() {
  const { data } = await api.get('/maintenance/document-types')
  return data
}
export async function createDocumentType(payload) {
  const { data } = await api.post('/maintenance/document-types', payload)
  return data
}
export async function updateDocumentType(id, payload) {
  const { data } = await api.put(`/maintenance/document-types/${id}`, payload)
  return data
}
export async function setDocumentTypeActive(id, isActive) {
  const { data } = await api.patch(`/maintenance/document-types/${id}/active`, { is_active: isActive })
  return data
}

// -- Staff ------------------------------------------------------------------
export async function getStaff() {
  const { data } = await api.get('/maintenance/staff')
  return data
}
/** The temporary password is sent once and never returned by the API. */
export async function createStaff(payload) {
  const { data } = await api.post('/maintenance/staff', payload)
  return data
}
export async function updateStaff(id, payload) {
  const { data } = await api.put(`/maintenance/staff/${id}`, payload)
  return data
}
export async function setStaffActive(id, isActive) {
  const { data } = await api.patch(`/maintenance/staff/${id}/active`, { is_active: isActive })
  return data
}
