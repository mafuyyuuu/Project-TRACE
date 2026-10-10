const documents = require('../models/document.model');
const users = require('../models/user.model');
const references = require('../models/referenceData.model');
const logs = require('../models/stepLog.model');
const { pool } = require('../config/db');
const { STATUS } = require('../utils/documentStatus');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const { isCaseReadOnly } = require('../utils/supportCase');

function processingDesk(status) {
  if ([STATUS.PENDING_W1_INTAKE, STATUS.READY_FOR_RELEASE].includes(status)) return 'Window 1';
  if ([STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION].includes(status)) return 'Finance';
  if ([STATUS.PENDING_SEC_EVALUATION, STATUS.SEC_PROCESSING, STATUS.PAID_PENDING_SEC_RELEASE, STATUS.SEC_OR_VERIFIED].includes(status)) return 'Secretary';
  return null;
}

async function collegeForStudent(studentId, executor = pool) {
  const rows = await users.findStudentCourseByStudentId(studentId, executor);
  if (rows.length !== 1) throw badRequest('Ask Admin to reconcile this student’s current or former college before routing.');
  const student = rows[0];
  const matches = student.college_id ? await references.findCollegeById(student.college_id, executor)
    : student.course ? (await references.findCollegeByName(student.course, executor)).filter(row => row.name === student.course) : [];
  if (matches.length !== 1 || !Number(matches[0].id) || Number(matches[0].is_active) !== 1) {
    throw badRequest('Ask Admin to reconcile this student’s current or former college before routing.');
  }
  return matches[0];
}

async function assertSecretaryScope(user, doc, executor = pool, { assigned = false } = {}) {
  const [account] = await users.findCourseById(user.id, executor);
  const students = doc.routing_college_id ? [] : await users.findStudentCourseByStudentId(doc.student_id, executor);
  const student = students.length === 1 ? students[0] : null;
  const matches = doc.routing_college_id
    ? account?.college_id && Number(account.college_id) === Number(doc.routing_college_id)
    : account?.college_id ? Number(account.college_id) === Number(student?.college_id) || (!student?.college_id && account.course && account.course === student?.course)
      : account?.course && account.course === student?.course;
  if (!matches) throw forbidden('You can only access requests for your assigned college.');
  if (assigned) await assertAssignedProcessor(user, doc, executor);
}

async function assertAssignedProcessor(user, doc, executor = pool) {
  if (!doc.assigned_clerk_id || Number(doc.assigned_clerk_id) === Number(user.id)) return;
  const [owner] = await users.findById(doc.assigned_clerk_id, executor);
  if (owner?.desk_assignment === user.desk_assignment) throw forbidden('This request belongs to another processor. Ask Admin to reassign it before acting.');
}

async function eligibleStaff(doc, executor = pool) {
  const desk = processingDesk(doc.current_status);
  if (!desk) return [];
  const staff = await users.listStaff({ includeInactive: false }, executor);
  const college = desk === 'Secretary' ? (doc.routing_college_id ? { id: doc.routing_college_id } : await collegeForStudent(doc.student_id, executor)) : null;
  const eligible = [];
  for (const person of staff.filter(person => person.role === 'clerk' && person.desk_assignment === desk && Number(person.is_active) === 1)) {
    if (desk === 'Secretary') {
      const [account] = await users.findCourseById(person.id, executor);
      if (!account?.college_id || Number(account.college_id) !== Number(college.id)) continue;
    }
    eligible.push({ id: person.id, full_name: person.full_name, desk_assignment: desk });
  }
  return eligible;
}

async function adminActor(user, executor = pool) {
  const [actor] = await users.findById(user.id, executor);
  if (user.role !== 'admin' || actor?.role !== 'admin' || !Number(actor.is_active)) throw forbidden('Only an active Admin can assign backup processing staff.');
}

async function context(user, documentId) {
  await adminActor(user);
  const [doc] = await documents.findById(documentId);
  if (!doc) throw notFound('Request not found.');
  const canReconcile = !doc.routing_college_id && !isCaseReadOnly(doc.current_status);
  const colleges = canReconcile ? await references.listColleges() : [];
  const students = canReconcile ? await users.findStudentForPolicy(doc.student_id) : [];
  let staff, collegeWarning;
  try { staff = await eligibleStaff(doc); }
  catch (error) {
    if (!canReconcile || error.status !== 400) throw error;
    staff = []; collegeWarning = error.message;
  }
  return { document: doc, colleges, profile_college_id: students.length === 1 ? students[0].college_id || null : null,
    can_reconcile_college: canReconcile, college_warning: collegeWarning, staff, desk: processingDesk(doc.current_status) };
}

/** Reconcile the recorded profile, not a client-supplied request owner. */
async function reconcileCollege(user, documentId, body = {}) {
  if (!Number.isSafeInteger(Number(body.college_id)) || Number(body.college_id) < 1 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) throw badRequest('Choose the verified current or former college and record your evidence.');
  const tx = await pool.getConnection();
  try {
    await tx.beginTransaction();
    await adminActor(user, tx);
    const [doc] = await documents.findByIdForUpdate(documentId, tx);
    if (!doc) throw notFound('Request not found.');
    if (isCaseReadOnly(doc.current_status) || doc.routing_college_id) throw badRequest('Only an open request without a saved routing college can have its profile college reconciled here.');
    const students = await users.findStudentForPolicy(doc.student_id, tx, true);
    if (students.length !== 1) throw badRequest('Identify the correct student account before reconciling its college.');
    const student = students[0];
    const [college] = await references.findCollegeById(Number(body.college_id), tx);
    if (!college || !Number(college.is_active)) throw badRequest('Choose an active college.');
    if (!Object.hasOwn(body, 'expected_college_id') || String(student.college_id || '') !== String(body.expected_college_id || '')) throw badRequest('The profile college changed. Refresh before reconciling.');
    await users.updateProfile(student.id, { college_id: college.id, course: college.name }, tx);
    if (doc.current_status !== STATUS.PENDING_W1_INTAKE) await documents.updateRoutingCollege(doc.id, college, tx);
    await logs.insert({ document_id: doc.id, clerk_id: user.id, action_taken: 'profile_college_reconciled', from_status: doc.current_status, to_status: doc.current_status,
      notes: `Verified ${student.user_type === 'alumni' ? 'former' : 'current'} college for account ${student.id}: ${student.college_id || student.course || 'missing'} → ${college.id} (${college.name}). ${body.reason.trim()}` }, tx);
    await tx.commit();
    return { message: doc.current_status === STATUS.PENDING_W1_INTAKE ? 'Profile college reconciled. Window 1 must still review and route the request.' : 'Legacy college scope reconciled and audited. The processing stage is unchanged.' };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.release(); }
}

async function reassign(user, documentId, body = {}) {
  if (!Number.isSafeInteger(Number(body.staff_id)) || Number(body.staff_id) < 1 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000
    || !Object.hasOwn(body, 'expected_staff_id') || !Object.hasOwn(body, 'expected_status')) throw badRequest('Choose staff and give a reason; refresh the assignment before saving.');
  const tx = await pool.getConnection();
  try {
    await tx.beginTransaction();
    await adminActor(user, tx);
    const [doc] = await documents.findByIdForUpdate(documentId, tx);
    if (!doc) throw notFound('Request not found.');
    if (String(doc.assigned_clerk_id || '') !== String(body.expected_staff_id || '') || doc.current_status !== body.expected_status) throw badRequest('The assignment or processing stage changed. Refresh before reassigning.');
    const staff = await eligibleStaff(doc, tx);
    const target = staff.find(person => person.id === Number(body.staff_id));
    if (!target) throw forbidden('Choose active staff from the current processing desk and college.');
    await documents.updateAssignedClerk(doc.id, target.id, tx);
    await logs.insert({ document_id: doc.id, clerk_id: user.id, action_taken: 'staff_reassigned', from_status: doc.current_status, to_status: doc.current_status,
      notes: `Assigned ${doc.assigned_clerk_id || 'unassigned'} → ${target.id} (${target.desk_assignment}). ${body.reason.trim()}` }, tx);
    await tx.commit();
    return { message: 'Processing staff reassigned. Existing permissions are unchanged.' };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.release(); }
}

module.exports = { processingDesk, collegeForStudent, assertSecretaryScope, assertAssignedProcessor, eligibleStaff, context, reassign, reconcileCollege };
