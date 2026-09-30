const { pool } = require('../config/db');
const { resolveSchedule } = require('../utils/pricing');

/** Complete overrides replace the default schedule, including its named items. */
async function attachSchedules(types, executor = pool) {
  const ids = types.map(type => type.id).filter(Boolean);
  if (!ids.length) return types.map(type => ({ ...type, fee_items: type.fee_items || [], college_fee_schedules: type.college_fee_schedules || [] }));
  const [rows] = await executor.query(`SELECT document_type_id, college_id, base_fee, fee_rule, rental_fee, special_fee, fee_items
    FROM document_fee_schedules WHERE document_type_id IN (${ids.map(() => '?').join(', ')}) ORDER BY college_id`, ids);
  return types.map(type => {
    const schedules = rows.filter(row => Number(row.document_type_id) === Number(type.id)).map(row => ({ ...row,
      fee_items: typeof row.fee_items === 'string' ? JSON.parse(row.fee_items) : row.fee_items || [] }));
    return { ...type, fee_items: schedules.find(row => row.college_id === null)?.fee_items || [],
      college_fee_schedules: schedules.filter(row => row.college_id !== null) };
  });
}
async function saveSchedules(typeId, { fee_items, college_fee_schedules }, executor) {
  // Parent row lock serializes replacement and filing a rate snapshot.
  await executor.query('SELECT id FROM document_types WHERE id = ? FOR UPDATE', [typeId]);
  if (fee_items !== undefined) {
    await executor.query('DELETE FROM document_fee_schedules WHERE document_type_id = ? AND college_id IS NULL', [typeId]);
    await executor.query(`INSERT INTO document_fee_schedules (document_type_id, college_id, fee_items)
      VALUES (?, NULL, ?)`, [typeId, JSON.stringify(fee_items)]);
  }
  if (college_fee_schedules !== undefined) {
    await executor.query('DELETE FROM document_fee_schedules WHERE document_type_id = ? AND college_id IS NOT NULL', [typeId]);
    for (const row of college_fee_schedules) await executor.query(`INSERT INTO document_fee_schedules
      (document_type_id, college_id, base_fee, fee_rule, rental_fee, special_fee, fee_items) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [typeId, row.college_id, row.base_fee, row.fee_rule, row.rental_fee, row.special_fee, JSON.stringify(row.fee_items)]);
  }
}
async function enrichDocuments(documents, executor = pool) {
  const old = documents.filter(doc => !doc.priced_at && !doc.pricing_snapshot);
  if (!old.length) return documents;
  const [rows] = await executor.query(`SELECT d.id AS document_id, t.*, u.college_id AS pricing_college_id
    FROM documents d JOIN document_types t ON t.name = d.document_type
    LEFT JOIN users u ON u.student_id = d.student_id AND u.role = 'student'
    WHERE d.id IN (${old.map(() => '?').join(', ')})`, old.map(doc => doc.id));
  const types = await attachSchedules(rows, executor);
  return documents.map(doc => {
    const type = types.find(row => row.document_id === doc.id);
    return type ? { ...doc, pricing_schedule: resolveSchedule(type, type.pricing_college_id), pricing_requires_review: true } : doc;
  });
}
module.exports = { attachSchedules, saveSchedules, enrichDocuments };
