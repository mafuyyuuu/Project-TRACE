const referenceModel = require('../models/referenceData.model');
const programModel = require('../models/program.model');
const pricingModel = require('../models/pricing.model');
const { resolveSchedule } = require('../utils/pricing');
const userModel = require('../models/user.model');
const policy = require('./documentPolicy.service');

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
async function listDocumentTypes({ includeInactive = false, user } = {}) {
  const rows = await pricingModel.attachSchedules(await referenceModel.listDocumentTypes({ includeInactive }));
  let student = null;
  if (user?.role === 'student') {
    const [owner] = await userModel.findStudentIdById(user.id);
    student = await policy.resolveStudent(owner?.student_id);
  }
  return {
    document_types: await Promise.all(rows.filter(row => !policy.isRetired(row.name)).map(async (row) => ({
      id: row.id,
      name: row.name,
      ...resolveSchedule(row, student?.college_id),
      requires_attachment: Boolean(row.requires_attachment),
      attachment_label: row.attachment_label,
      attachment_helper: row.attachment_helper,
      is_active: Boolean(row.is_active),
      available_to: row.available_to || 'both',
      is_repeatable: policy.repeatable(row),
      is_walk_in: policy.enabled(row.is_walk_in),
      requires_original: policy.sameDayWalkIn(row.name) || policy.enabled(row.requires_original),
      is_same_day: policy.sameDayWalkIn(row.name),
      allowed_college_ids: row.allowed_college_ids || [],
      unavailable_reason: user?.role === 'student' ? await policy.eligibility(row, student) : null,
    }))),
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

async function listPrograms() {
  return { programs: await programModel.list() };
}

module.exports = { listPrograms, listColleges, listDocumentTypes, listPaymentMethods };
