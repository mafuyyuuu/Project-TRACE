const userModel = require('../models/user.model');
const referenceModel = require('../models/referenceData.model');
const documentModel = require('../models/document.model');
const { pool } = require('../config/db');
const { badRequest } = require('../utils/AppError');

const enabled = value => value === true || Number(value) === 1;
const repeatable = type => type.name !== 'Honorable Dismissal' && type.is_repeatable !== false && Number(type.is_repeatable) !== 0;
const RETIRED_DOCUMENT_NAMES = ['Certificate of Good Moral', 'Certificate of Good Moral Character', 'Good Moral Certificate'];
const retiredNames = new Set(RETIRED_DOCUMENT_NAMES.map(name => name.toLowerCase()));
const isRetired = name => retiredNames.has(String(name || '').trim().replace(/\s+/g, ' ').toLowerCase());
const RETIREMENT_REASON = 'Good Moral certificates are no longer available for new requests. Existing requests remain on record.';

async function resolveStudent(studentId, executor = pool, lock = false) {
  if (!studentId) return null;
  const [student] = await userModel.findStudentForPolicy(studentId, executor, lock);
  if (!student) return null;
  if (!student.college_id && student.course) {
    const colleges = await referenceModel.findCollegeByName(student.course, executor);
    const exact = colleges.find(college => college.name === student.course);
    if (exact) return { ...student, college_id: exact.id };
  }
  return student;
}

async function eligibility(type, student, { counter = false, excludeId = null, executor = pool, allowUnidentified = false } = {}) {
  if (!type) return 'Unknown document type.';
  if (excludeId === null && isRetired(type.name)) return RETIREMENT_REASON;
  if (excludeId === null && (type.is_active === false || type.is_active === 0)) return 'This document type is inactive.';
  if (enabled(type.is_walk_in) && !counter) return 'Request this document at Window 1.';
  // A raw counter scan is staged for human identity review, never SEC_PROCESSING.
  if (!student && counter && allowUnidentified) return null;
  const audience = type.available_to || 'both';
  const colleges = type.allowed_college_ids || [];
  if (!student && (audience !== 'both' || colleges.length || !repeatable(type))) return 'Identify the student before processing this document.';
  if (student && audience !== 'both' && audience !== (student.user_type || 'student')) return 'This document is unavailable for this applicant type.';
  if (colleges.length && !colleges.map(Number).includes(Number(student?.college_id))) return 'This document is unavailable for this college. Ask Admin to review an unassigned college.';
  if (student && !repeatable(type) && await documentModel.countBlockingRequests(type.name, student.student_id, excludeId, executor)) {
    return 'An active or completed request already exists for this document.';
  }
  return null;
}

async function assertAllowed(type, student, options = {}) {
  const reason = await eligibility(type, student, options);
  if (reason) throw badRequest(reason);
  if (!repeatable(type) && Number(options.copies ?? 1) !== 1) throw badRequest('This document allows one copy per request.');
}

async function assertDocument(doc, { studentId = doc.student_id, documentType = doc.document_type, executor = pool, allowUnidentified = false } = {}) {
  if (isRetired(documentType) && documentType !== doc.document_type) throw badRequest(RETIREMENT_REASON);
  const [type] = await referenceModel.findDocumentTypeByName(documentType, executor);
  if (!type) throw badRequest('Unknown document type.');
  const student = await resolveStudent(studentId, executor, true);
  await assertAllowed(type, student, { counter: true, excludeId: doc.id, copies: doc.copies, executor, allowUnidentified: allowUnidentified && !studentId && Boolean(doc.file_path) });
  return type;
}

module.exports = { enabled, repeatable, isRetired, RETIRED_DOCUMENT_NAMES, RETIREMENT_REASON, resolveStudent, eligibility, assertAllowed, assertDocument };
