import api from '@/services/api'

/**
 * Admin-managed reference data. These lists used to be hardcoded `<option>`
 * tags; serving them from the API means the Maintenance module can change them
 * without a redeploy.
 */

/** Colleges for the signup and profile dropdowns. Public — signup has no token. */
export async function getColleges(options = {}) {
  const { data } = await api.get('/reference/colleges', options)
  return data
}

/**
 * Document types the student can request, including fee and attachment rules.
 * @returns {Promise<{document_types: Array<{name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper}>}>}
 */
export async function getDocumentTypes() {
  const { data } = await api.get('/reference/document-types')
  if (!Array.isArray(data?.document_types) || data.document_types.some(type => !type || typeof type.name !== 'string' || !type.name.trim())) {
    throw new Error('Invalid document catalog response.')
  }
  return data
}

/**
 * Payment methods the student can choose at checkout, each with its own
 * instructions and reference label.
 */
export async function getPaymentMethods() {
  const { data } = await api.get('/reference/payment-methods')
  return data
}

/** Public active programs in active colleges, shared by signup and profiles. */
export async function getPrograms(options = {}) {
  const { data } = await api.get('/reference/programs', options)
  return data
}
