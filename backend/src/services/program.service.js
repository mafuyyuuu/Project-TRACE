const { pool } = require('../config/db');
const model = require('../models/program.model');
const referenceModel = require('../models/referenceData.model');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const active = value => value === true || value === 1 || value === '1';
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw badRequest('Choose a valid college or program.');
  return Number(value);
}
function assertAdmin(user) { if (user?.role !== 'admin') throw forbidden('Admin access required.'); }
async function transaction(action) {
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const result = await action(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function list(user) {
  assertAdmin(user);
  return { programs: await model.list({ includeInactive: true }) };
}
async function create(user, body) {
  assertAdmin(user);
  const collegeId = id(body?.college_id);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 150) throw badRequest('Program name is required and must be at most 150 characters.');
  try {
    return await transaction(async connection => {
      const college = await model.lockCollege(collegeId, connection);
      if (!college || !active(college.is_active)) throw badRequest('Choose an active college.');
      if (await model.findByName(collegeId, name, connection)) throw badRequest('This program already exists in the college. Restore it if inactive.');
      const programId = await model.create(collegeId, name, connection);
      return { id: programId, message: 'Registrar-approved program added.' };
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw badRequest('This program already exists in the college. Restore it if inactive.');
    throw error;
  }
}
async function setActive(user, programId, isActive) {
  assertAdmin(user);
  const key = id(programId);
  if (typeof isActive !== 'boolean') throw badRequest('Program status must be true or false.');
  const existing = await model.find(key);
  if (!existing) throw notFound('Program not found.');
  return transaction(async connection => {
    const college = await model.lockCollege(existing.college_id, connection);
    const program = await model.find(key, connection, true);
    if (!program) throw notFound('Program not found.');
    if (isActive && !active(college?.is_active)) throw badRequest('Restore the college before restoring its program.');
    await model.setActive(key, isActive, connection);
    return { message: isActive ? 'Program restored.' : 'Program deactivated. Saved profiles are preserved.' };
  });
}

// Legacy academic values survive unrelated edits. A changed selection must be
// a real active catalog member. course remains the college display name.
async function profileFields(current, draft, executor = pool, lock = false) {
  const collegeId = draft.college_id === undefined ? current.college_id : draft.college_id;
  const programName = draft.program === undefined ? current.program : draft.program;
  const changed = String(collegeId ?? '') !== String(current.college_id ?? '') || (programName || '') !== (current.program || '');
  if (!changed) {
    if (draft.course !== undefined && draft.course !== current.course) throw badRequest('Select College instead of editing its display name.');
    return {};
  }
  if (current.role !== 'student') throw forbidden('Academic selections can only be changed for student profiles.');
  const key = id(collegeId);
  if (typeof programName !== 'string' || !programName.trim() || programName.length > 150) throw badRequest('Choose a program for the selected college.');
  // Lock ordering matches catalog writes (college, then program).
  const college = lock ? await model.lockCollege(key, executor) : (await referenceModel.findCollegeById(key, executor))[0];
  if (!college || !active(college.is_active)) throw badRequest('Choose an active college.');
  const program = await model.findByName(key, programName.trim(), executor, lock);
  if (!program || !active(program.is_active)) throw badRequest('Choose an active program belonging to the selected college.');
  return { college_id: college.id, course: college.name, program: program.name };
}
module.exports = { list, create, setActive, profileFields };
