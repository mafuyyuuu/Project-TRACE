const model = require('../models/supportMessage.model');
const desks = require('../models/documentMessage.model');
const notifications = require('./notification.service');
const { pool } = require('../config/db');
const { forbidden, badRequest, notFound } = require('../utils/AppError');
function deskAllowed(user) { return user.role === 'admin' || (user.role === 'clerk' && ['Window 1', 'Receiving Desk'].includes(user.desk_assignment)); }
function checkRole(user, studentId) {
  if (user.role === 'student') { if (studentId !== user.id) throw forbidden('You can only open your own Window 1 support conversation.'); }
  else if (!deskAllowed(user)) throw forbidden('General support is handled by Window 1.');
}
async function conversation(user, id, action) {
  const studentId = Number(id);
  if (!Number.isSafeInteger(studentId) || studentId < 1) throw badRequest('Choose a valid support conversation.');
  checkRole(user, studentId);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const student = await model.lockStudent(studentId, connection);
    if (!student || student.role !== 'student' || !student.is_active) throw notFound('Student support conversation is unavailable.');
    const result = await action(studentId, connection);
    await connection.commit(); return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function list(user, rawPage) {
  checkRole(user, user.id);
  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw badRequest('Choose a valid conversation page.');
  return { ...await model.threads(user.role === 'student' ? user.id : null, page), page, limit: 20 };
}
async function read(user, id) {
  return conversation(user, id, async (studentId, connection) => {
    const rows = await model.messages(studentId, connection);
    if (rows.length) await model.markRead(studentId, user.role === 'student', rows[rows.length - 1].id, connection);
    return rows;
  });
}
async function send(user, id, body) {
  if (typeof body?.message !== 'string' || !body.message.trim() || body.message.trim().length > 2000) throw badRequest('Enter a message of 1–2000 characters.');
  const message = body.message.trim();
  const result = await conversation(user, id, async (studentId, connection) => {
    const [inserted] = await model.insert(studentId, user.id, message, connection);
    return { id: inserted.insertId, student_user_id: studentId, sender_id: user.id, sender_name: user.full_name || 'TRACE user', sender_role: user.role, message, created_at: new Date().toISOString() };
  });
  try {
    const recipients = user.role === 'student' ? await desks.window1Recipients() : [{ id: result.student_user_id }];
    await notifications.notifyInAppBulk(recipients, { title: 'Window 1 support message', message: user.role === 'student' ? 'A student sent a general support message.' : 'Window 1 replied to your support conversation.', type: 'info', actionUrl: `/dashboard?tab=messages&support=${result.student_user_id}` });
  } catch { /* A notification failure cannot undo an accepted send. */ }
  return result;
}
module.exports = { list, read, send };
