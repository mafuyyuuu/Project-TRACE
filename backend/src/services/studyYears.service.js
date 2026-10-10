const { pool } = require('../config/db');
const userModel = require('../models/user.model');
const model = require('../models/studyYears.model');
const { studyYearErrors } = require('../utils/profileYears');
const { badRequest, forbidden, notFound } = require('../utils/AppError');

const keys = ['year_started', 'graduation_year'];
const values = account => Object.fromEntries(keys.map(key => [key, account[key] == null || account[key] === '' ? null : Number(account[key])]));
const draftValues = (draft, account = {}) => Object.fromEntries(keys.map(key => [key,
  Object.hasOwn(draft, key) ? draft[key] : account[key] == null ? '' : String(account[key])]));

function validate(draft, account) {
  const errors = studyYearErrors(draft, { required: account.user_type === 'alumni' });
  if (Object.keys(errors).length) throw badRequest(Object.values(errors)[0]);
  return Object.fromEntries(keys.map(key => [key, draft[key] ? Number(draft[key]) : null]));
}

function validateSelf(draft, account) {
  if (!keys.some(key => Object.hasOwn(draft, key))) return;
  if (account.role !== 'student') throw forbidden('Study years belong to student profiles.');
  for (const key of keys) {
    const saved = account[key];
    if (saved != null && saved !== '' && Object.hasOwn(draft, key) && String(draft[key]) !== String(saved)) {
      throw forbidden('Saved study years can only be corrected by an authorized administrator.');
    }
  }
  // An unrelated save must preserve historical values, even outside today's range.
  if (keys.every(key => !Object.hasOwn(draft, key) || String(draft[key] ?? '') === String(account[key] ?? ''))) return;
  validate(draftValues(draft, account), account);
}

async function completeLocked(account, draft, executor) {
  validateSelf(draft, account);
  const before = values(account);
  if (keys.every(key => !Object.hasOwn(draft, key) || String(draft[key] ?? '') === String(account[key] ?? ''))) return;
  const after = validate(draftValues(draft, account), account);
  await model.save(account.id, after, executor);
  await model.record({ userId: account.id, actorId: account.id, kind: 'initial', before, after,
    reason: 'Student supplied missing study years.' }, executor);
}

async function initialize(userId, draft, executor) {
  const after = validate(draft, { user_type: 'alumni' });
  await model.save(userId, after, executor);
  await model.record({ userId, actorId: userId, kind: 'initial', before: { year_started: null, graduation_year: null },
    after, reason: 'Alumni registration.' }, executor);
}

async function correct(actor, userId, draft) {
  if (actor.role !== 'admin') throw forbidden('Only administrators may correct study years.');
  if (typeof draft.reason !== 'string' || !draft.reason.trim() || draft.reason.trim().length > 1000) {
    throw badRequest('A correction reason of at most 1000 characters is required.');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [account] = await userModel.getProfileById(userId, connection, true);
    if (!account || account.role !== 'student') throw notFound('Student profile not found.');
    const after = validate(draftValues(draft), account);
    const before = values(account);
    if (keys.every(key => before[key] === after[key])) throw badRequest('No study years have changed.');
    await model.save(account.id, after, connection);
    await model.record({ userId: account.id, actorId: actor.id, kind: 'correction', before, after,
      reason: draft.reason.trim() }, connection);
    await connection.commit();
    return { message: 'Study years corrected. Existing document requests retain their original details.', ...after };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { initialize, validateSelf, completeLocked, correct };
