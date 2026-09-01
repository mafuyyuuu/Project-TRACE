const referenceModel = require('../models/referenceData.model');

/**
 * Admin-managed reference data — colleges and document types.
 *
 * These used to be hardcoded `<option>` lists in the frontend and fee constants
 * in code. Serving them from the database lets the Maintenance module change
 * them without a deploy, and gives the request form a single source of truth.
 *
 * Reads only for now; the CRUD writes land with the Category 2 Maintenance
 * module.
 */

async function listColleges({ includeInactive = false } = {}) {
  return { colleges: await referenceModel.listColleges({ includeInactive }) };
}

/**
 * Document types, shaped for the request form: numeric fees and real booleans
 * rather than the strings/0-1 ints MySQL returns.
 */
async function listDocumentTypes({ includeInactive = false } = {}) {
  const rows = await referenceModel.listDocumentTypes({ includeInactive });
  return {
    document_types: rows.map((row) => ({
      id: row.id,
      name: row.name,
      base_fee: parseFloat(row.base_fee),
      fee_rule: row.fee_rule,
      requires_attachment: Boolean(row.requires_attachment),
      attachment_label: row.attachment_label,
      attachment_helper: row.attachment_helper,
      is_active: Boolean(row.is_active),
    })),
  };
}

/**
 * Payment methods a student may choose at checkout, with the per-method
 * instructions and reference label the UI renders.
 */
async function listPaymentMethods({ includeInactive = false } = {}) {
  const rows = await referenceModel.listPaymentMethods({ includeInactive });
  return {
    payment_methods: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      provider: row.provider,
      instructions: row.instructions,
      requires_reference: Boolean(row.requires_reference),
      reference_label: row.reference_label,
      requires_proof: Boolean(row.requires_proof),
      is_active: Boolean(row.is_active),
      // Only GCash has an on-screen QR to scan.
      show_qr: row.code === 'gcash',
    })),
  };
}

module.exports = { listColleges, listDocumentTypes, listPaymentMethods };
