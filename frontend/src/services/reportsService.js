import api from '@/services/api'
import { decodeCsvError } from '@/utils/csvDownloadError'

/** Filtered reporting, CSV export and efficiency analytics. */

/**
 * @param {{dateFrom?, dateTo?, status?, documentType?, paymentStatus?, page?, limit?}} filters
 */
export async function getDocumentReport(filters = {}) {
  const { data } = await api.get('/reports/documents', { params: filters })
  return data
}

export async function getAnalytics(filters = {}) {
  const { data } = await api.get('/reports/analytics', { params: filters })
  return data
}

/**
 * Download a CSV.
 *
 * The response is fetched as a blob through the authenticated axios instance —
 * a plain link can't send the bearer token — then handed to the browser via a
 * temporary object URL.
 */
async function downloadCsv(path, params) {
  let response
  try {response = await api.get(path, { params, responseType: 'blob' })}
  catch(error) {throw await decodeCsvError(error)}

  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : 'export.csv'

  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return filename
}

/**
 * @param {'active'|'alumni'|'others'|'all'} category
 */
export function exportStudentsCsv(category = 'all', filters = {}) {
  const {studentSearch,studentId,studentName,collegeId}=filters;
  return downloadCsv('/reports/export/students.csv', { category, studentSearch, studentId, studentName, collegeId })
}

export function exportDocumentsCsv(filters = {}) {
  return downloadCsv('/reports/export/documents.csv', filters)
}

export async function getReportFilterOptions(signal) {
  const {data}=await api.get('/reports/filter-options',{signal});
  if(!Array.isArray(data?.colleges)||!Array.isArray(data?.document_types)) throw new Error('Invalid report options response.');
  return data;
}
