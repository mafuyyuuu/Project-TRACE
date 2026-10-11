const references = require('../models/referenceData.model');
const users = require('../models/user.model');
const { badRequest, forbidden } = require('../utils/AppError');
const { validReceiptDate } = require('../utils/receiptTiming');
const { PIPELINE, LEGACY_STATUS } = require('../utils/documentStatus');

function dateRange(from, to) {
  if ((from && !validReceiptDate(from)) || (to && !validReceiptDate(to))) throw badRequest('Choose a valid YYYY-MM-DD date range.');
  if(from && to && from > to) throw badRequest('From must be on or before To.');
}
function text(value, label, max) {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) throw badRequest(`Invalid ${label}.`);
  return value.trim() || undefined;
}
async function secretaryScope(user) {
  if (user.role !== 'clerk' || user.desk_assignment !== 'Secretary') return {};
  const [account] = await users.findCourseById(user.id);
  if (!account?.college_id && !account?.course) throw forbidden('A college assignment is required to view or export Secretary records.');
  return { collegeId: account.college_id || null, collegeName: account.course || null };
}
async function identity(user, query = {}) {
  const result = { studentId: text(query.studentId, 'student ID', 50), studentName: text(query.studentName, 'student name', 255), documentType: text(query.documentType, 'document type', 150) };
  if (result.documentType && !(await references.findDocumentTypeByName(result.documentType)).length) throw badRequest('Choose a document type from the institutional catalog.');
  const scope = await secretaryScope(user);
  if (query.collegeId != null && query.collegeId !== '') {
    const id = Number(query.collegeId);
    if (typeof query.collegeId === 'object' || !Number.isSafeInteger(id) || id < 1) throw badRequest('Choose a valid college.');
    if (scope.collegeId && id !== Number(scope.collegeId)) throw forbidden('You can only report on your assigned college.');
    const [college] = await references.findCollegeById(id);
    if (!college || Number(college.is_active) !== 1) throw badRequest('Choose an active college.');
    if (scope.collegeName && !scope.collegeId && college.name !== scope.collegeName) throw forbidden('You can only report on your assigned college.');
    result.collegeId = id; result.collegeName = college.name;
  }
  return { ...result, ...scope };
}
async function options(user) {
  if (!user || !['admin', 'clerk'].includes(user.role)) throw forbidden('Staff access required.');
  const scope = await secretaryScope(user);
  const colleges = await references.listColleges();
  return { colleges: colleges.filter(college => !scope.collegeId && !scope.collegeName || Number(college.id) === Number(scope.collegeId) || !scope.collegeId && college.name === scope.collegeName),
    document_types: (await references.listDocumentTypes({includeInactive:true})).map(type => ({id:type.id,name:type.name,is_active:type.is_active})), college_locked: Boolean(scope.collegeId || scope.collegeName) };
}
function validateDocumentState(query) {
  if (query.status && ![...PIPELINE, LEGACY_STATUS.APPROVED, LEGACY_STATUS.REJECTED].includes(query.status)) throw badRequest('Choose a valid request status.');
  if (query.paymentStatus && !['PAID','UNPAID'].includes(query.paymentStatus)) throw badRequest('Choose a valid payment status.');
}
module.exports = { dateRange, identity, secretaryScope, options, validateDocumentState };
