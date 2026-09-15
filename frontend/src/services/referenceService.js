import api from '@/services/api'

/**
 * Admin-managed reference data. These lists used to be hardcoded `<option>`
 * tags; serving them from the API means the Maintenance module can change them
 * without a redeploy.
 */

/** Colleges for the signup and profile dropdowns. Public — signup has no token. */
export async function getColleges() {
  const { data } = await api.get('/reference/colleges')
  return data
}

/**
 * Document types the student can request, including fee and attachment rules.
 * @returns {Promise<{document_types: Array<{name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper}>}>}
 */
export async function getDocumentTypes() {
  const { data } = await api.get('/reference/document-types')
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
