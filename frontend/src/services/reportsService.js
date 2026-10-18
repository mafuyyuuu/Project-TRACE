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

/** Authenticated, server-generated PDF. The server rechecks Admin authorization. */
export async function downloadReportPdf(kind, filters = {}, signal) {
  if (!['records','efficiency','support'].includes(kind)) throw new Error('Choose a valid PDF report.');
  let response;
  try {
    response = await api.get(`/reports/export/${kind}.pdf`, { params: filters, responseType:'blob', signal, timeout:90000 });
  } catch(error) { throw await decodeCsvError(error); }
  if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
  const blob=response.data;
  if(!blob || blob.size<5 || !(response.headers['content-type'] || blob.type || '').startsWith('application/pdf') || await blob.slice(0,5).text()!=='%PDF-') throw new Error('The server did not return a valid PDF. Retry the export.');
  if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
  const name=(response.headers['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1];
  const filename=/^trace-(records|efficiency|support)-report-\d{4}-\d{2}-\d{2}\.pdf$/.test(name || '')?name:`trace-${kind}-report.pdf`;
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try {link.href=url;link.download=filename;document.body.appendChild(link);link.click();}
  finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000).unref?.();}
  return filename;
}
export async function getAiEvaluation(params = {}, signal) {
  const { data } = await api.get('/reports/ai-evaluation', { params, signal });
  return data;
}
