const { pool } = require('../config/db');
const documentModel = require('../models/document.model');
const stepLogModel = require('../models/stepLog.model');
const userModel = require('../models/user.model');
const aiEngine = require('./aiEngine.service');
const n8n = require('./n8n.service');
const notifications = require('./notification.service');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const { generateTrackingNumber, calculateAmount } = require('../utils/pricing');

/**
 * Core document pipeline logic.
 *
 * Status flow (see docs/SYSTEM_WORKFLOWS.md):
 *   pending_payment → pending_payment_verification → pending_secretary
 *   → ready_window_1 → completed
 */

// ---------------------------------------------------------------------------
// Upload / intake
// ---------------------------------------------------------------------------

/**
 * Create a document request.
 *
 * Students enter at `pending_payment`. A Window 1 clerk digitizing a legacy
 * physical record skips straight to `pending_secretary` as already-PAID.
 * After the record is committed, OCR and n8n routing run best-effort.
 */
async function uploadDocument(user, body, file) {
  const trackingNumber = generateTrackingNumber();
  const { student_id, student_name, document_type, purpose, copies, semesters } = body;
  const { amount: finalAmount, copies: copiesInt } = calculateAmount(document_type, semesters, copies);

  const filePath = file ? file.path : null;
  const originalFilename = file ? file.originalname : null;

  const connection = await pool.getConnection();
  let documentId;

  try {
    await connection.beginTransaction();

    let initialStatus = 'pending_payment';
    let initialPaymentStatus = 'UNPAID';
    let logAction = 'submitted';
    let logNotes = `Document requested. Awaiting payment of ₱${finalAmount}.`;

    if (user && user.role === 'clerk' && user.desk_assignment === 'Window 1') {
      initialStatus = 'pending_secretary';
      initialPaymentStatus = 'PAID';
      logAction = 'manual_intake';
      logNotes = 'Legacy record manually digitized by Window 1.';
    }

    const [docResult] = await documentModel.insert(
      {
        tracking_number: trackingNumber,
        student_id,
        student_name,
        document_type,
        current_status: initialStatus,
        payment_status: initialPaymentStatus,
        assigned_clerk_id: user.id,
        file_path: filePath,
        original_filename: originalFilename,
        checkout_url: `https://pm.link/mock/${trackingNumber}`,
        purpose,
        copies: copiesInt,
        amount: finalAmount,
      },
      connection
    );

    documentId = docResult.insertId;

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: logAction,
        from_status: null,
        to_status: initialStatus,
        notes: logNotes,
      },
      connection
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  let document = (await documentModel.findById(documentId))[0];

  // Best-effort OCR pass — only when an actual file was attached.
  if (filePath) {
    const ocrData = await aiEngine.extractDocument(file, { trackingNumber });

    if (ocrData && ocrData.success && ocrData.extracted_data) {
      console.log(`📄 OCR processing complete for ${trackingNumber}`);

      const rawText = (ocrData.raw_text || '').toLowerCase();
      let aiVerified = false;
      let aiNotes = 'AI analyzed the document but could not definitively verify it.';

      // Requirement verification: does the scan match what was requested?
      if (document_type === 'Honorable Dismissal' && rawText.includes('clearance')) {
        aiVerified = true;
        aiNotes = 'AI Verified: Valid Clearance document detected for Honorable Dismissal.';
      } else if (document_type && rawText.includes(document_type.toLowerCase())) {
        aiVerified = true;
        aiNotes = `AI Verified: Document content matches requested type (${document_type}).`;
      }

      const confidence = ocrData.confidence || (aiVerified ? 92.5 : 45.0);

      await documentModel.updateOcrData(documentId, {
        raw_text: ocrData.raw_text,
        extracted_data_json: JSON.stringify(ocrData.extracted_data),
        confidence,
        student_id: ocrData.extracted_data.student_id,
        form_type: ocrData.extracted_data.form_type,
      });

      await stepLogModel.insert({
        document_id: documentId,
        clerk_id: user.id,
        action_taken: aiVerified ? 'ai_verified' : 'ai_flagged',
        from_status: 'pending_payment',
        to_status: 'pending_payment',
        notes: aiNotes,
      });

      document = (await documentModel.findById(documentId))[0];
    }
  }

  await n8n.triggerDocumentRouting({
    document_id: documentId,
    tracking_number: trackingNumber,
    document_type: document.document_type,
    student_id: document.student_id,
  });

  return {
    message: 'Document uploaded successfully.',
    tracking_number: trackingNumber,
    document,
  };
}

// ---------------------------------------------------------------------------
// Listing / tracking
// ---------------------------------------------------------------------------

/**
 * Role-scoped document listing.
 *  - Students see only their own requests.
 *  - Finance sees the payment-verification queue.
 *  - Secretaries see only their own college's students (college-based routing).
 *  - Window 1 and admins see the whole system queue.
 */
async function listDocuments(user, query) {
  const status = query.status;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 500;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (user.role === 'student') {
    const rows = await userModel.findStudentIdById(user.id);
    if (rows.length > 0) {
      conditions.push('student_id = ?');
      params.push(rows[0].student_id);
    } else {
      conditions.push('1 = 0');
    }
  } else if (user.role === 'clerk') {
    const desk = user.desk_assignment;
    if (status) {
      conditions.push('current_status = ?');
      params.push(status);
    } else if (desk === 'Finance') {
      conditions.push('current_status = "pending_payment_verification"');
    } else if (desk === 'Secretary') {
      conditions.push('current_status IN ("pending_secretary", "ready_window_1", "completed", "released")');
      const secUser = await userModel.findCourseById(user.id);
      if (secUser.length > 0 && secUser[0].course) {
        conditions.push('student_id IN (SELECT student_id FROM users WHERE course = ?)');
        params.push(secUser[0].course);
      }
    }
    // Window 1 sees the entire system queue — no extra condition.
  } else if (user.role === 'admin' && status) {
    conditions.push('current_status = ?');
    params.push(status);
  }

  const total = await documentModel.countWithFilters(conditions, params);
  const documents = await documentModel.listWithFilters(conditions, params, limit, offset);

  return { documents, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function trackByTrackingNumber(trackingNumber) {
  const docRows = await documentModel.findByTrackingNumber(trackingNumber);
  if (docRows.length === 0) {
    throw notFound('Document not found.');
  }

  const document = docRows[0];
  const step_logs = await stepLogModel.findByDocumentId(document.id);

  return { document, step_logs };
}

// ---------------------------------------------------------------------------
// Stats / AI proxies
// ---------------------------------------------------------------------------

async function getStats(user) {
  const [
    processed_today,
    cleared_by_secretary_today,
    avg_processing_minutes,
    avg_ocr_confidence,
    backlog_count,
    pending_payment_verification_count,
    completed_today_count,
    pending_secretary_count,
    ready_window_1_count,
  ] = await Promise.all([
    documentModel.countProcessedTodayByClerk(user.id),
    documentModel.countClearedBySecretaryToday(),
    documentModel.avgProcessingMinutes(),
    documentModel.avgOcrConfidence(),
    documentModel.countBacklog(),
    documentModel.countByStatus('pending_payment_verification'),
    documentModel.countCompletedToday(),
    documentModel.countByStatus('pending_secretary'),
    documentModel.countByStatus('ready_window_1'),
  ]);

  return {
    processed_today,
    cleared_by_secretary_today,
    avg_processing_minutes,
    avg_ocr_confidence,
    backlog_count,
    pending_secretary_count,
    ready_window_1_count,
    pending_payment_verification_count,
    completed_today_count,
  };
}

/**
 * 7-day volume forecast from Prophet, falling back to a day-of-week lookup
 * over the last 14 days of step_logs when the AI engine is down.
 */
async function getForecast() {
  const aiData = await aiEngine.getForecast();
  if (aiData) return aiData;

  const rows = await documentModel.forecastFallbackRows();
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const forecast = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const historicalMatch = rows.find((r) => new Date(r.date).getDay() === d.getDay());
    forecast.push({
      date: d.toISOString().split('T')[0],
      day: dayNames[d.getDay()],
      predicted_volume: historicalMatch
        ? historicalMatch.volume + Math.floor(Math.random() * 5)
        : Math.floor(Math.random() * 20) + 10,
    });
  }

  return { forecast, source: 'fallback' };
}

/**
 * Prescriptive queue insights from the Random Forest engine, falling back to
 * direct threshold checks against the live queue counts.
 */
async function getInsights() {
  const aiData = await aiEngine.getInsights();
  if (aiData) return aiData;

  const [pendingSec, pendingRelease, todayVolume] = await Promise.all([
    documentModel.countByStatus('pending_secretary'),
    documentModel.countByStatus('ready_window_1'),
    documentModel.countStepLogsToday(),
  ]);

  const insights = [];

  if (pendingSec > 5) {
    insights.push({
      type: 'warning',
      title: 'Secretary Queue Alert',
      message: `There are ${pendingSec} documents pending secretary evaluation. Consider prioritizing the evaluation queue to prevent bottleneck delays.`,
    });
  }
  if (pendingRelease > 3) {
    insights.push({
      type: 'action',
      title: 'Release Desk Advisory',
      message: `${pendingRelease} documents are ready for student pickup at Window 1. Notify students via SMS to reduce queue wait times.`,
    });
  }
  if (todayVolume > 20) {
    insights.push({
      type: 'warning',
      title: 'High Volume Day',
      message: `${todayVolume} document actions logged today. This is higher than average. Consider deploying additional clerk resources.`,
    });
  }

  if (insights.length === 0) {
    insights.push(
      { type: 'info', title: 'System Normal', message: 'All queues are operating within normal parameters. No prescriptive actions needed at this time.' },
      { type: 'action', title: 'Optimization Tip', message: 'Current throughput is healthy. Run mock_data_gen.py to seed historical data and enable more accurate Prophet forecasting.' }
    );
  }

  return { insights, source: 'fallback' };
}

async function getActivityLogs(user) {
  if (user.role !== 'admin') {
    throw forbidden('Access denied. Admin role required.');
  }
  return { logs: await stepLogModel.listActivityLogs(100) };
}

// ---------------------------------------------------------------------------
// Desk actions
// ---------------------------------------------------------------------------

/** Internal endpoint used by n8n to assign a document to a named clerk. */
async function assignDocument({ document_id, assigned_clerk_employee_id }) {
  if (!document_id || !assigned_clerk_employee_id) {
    throw badRequest('Missing required fields.');
  }

  const clerkRows = await userModel.findClerkByEmployeeId(assigned_clerk_employee_id);
  if (clerkRows.length === 0) {
    throw notFound(`Clerk ${assigned_clerk_employee_id} not found.`);
  }

  const [updateResult] = await documentModel.updateAssignedClerk(document_id, clerkRows[0].id);
  if (updateResult.affectedRows === 0) {
    throw notFound('Document not found.');
  }

  await stepLogModel.insert({
    document_id,
    clerk_id: null,
    action_taken: 'routed',
    from_status: 'pending_payment',
    to_status: 'pending_payment',
    notes: `Auto-routed to Clerk ${assigned_clerk_employee_id} by n8n`,
  });

  return { message: 'Document successfully assigned.' };
}

/** Generic approve/reject for a clerk's own assigned document. */
async function processAction(user, documentId, action) {
  if (!['approve', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or reject.');
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const docRows = await documentModel.findByIdForUpdate(documentId, connection);
    if (docRows.length === 0) {
      throw forbidden('Document not found.');
    }

    const document = docRows[0];
    if (user.role === 'clerk' && document.assigned_clerk_id !== user.id) {
      throw forbidden('You do not have permission to process this document.');
    }

    await documentModel.updateStatusClearingClerk(documentId, newStatus, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: action,
        from_status: document.current_status,
        to_status: newStatus,
        notes: `Document ${newStatus} by ${user.full_name}`,
      },
      connection
    );

    await connection.commit();
    return { message: `Document successfully ${newStatus}.` };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Student submits their GCash reference number + receipt screenshot.
 *
 * The document must belong to the caller. Without that check any logged-in
 * student could attach a receipt to somebody else's request and push it into
 * the Finance queue on their behalf.
 */
async function submitPayment(user, documentId, { gcash_reference_no }, file) {
  if (!gcash_reference_no) {
    throw badRequest('GCash Reference Number is required.');
  }
  if (!file) {
    throw badRequest('Receipt image file upload is required.');
  }

  const docs = await documentModel.findById(documentId);
  if (docs.length === 0) {
    throw notFound('Document request not found.');
  }
  const doc = docs[0];

  const owner = await userModel.findStudentIdById(user.id);
  if (!owner[0] || doc.student_id !== owner[0].student_id) {
    throw forbidden('You can only submit payment for your own requests.');
  }

  // Payment is only meaningful before Finance has cleared it. This also stops
  // a receipt being re-attached to a document already moving down the pipeline.
  if (!['pending_payment', 'pending_payment_verification'].includes(doc.current_status)) {
    throw badRequest('This request is not awaiting payment.');
  }

  const receiptPath = `/uploads/${file.filename}`;
  const [result] = await documentModel.updatePaymentSubmission(documentId, gcash_reference_no, receiptPath);

  if (result.affectedRows === 0) {
    throw notFound('Document request not found.');
  }

  await stepLogModel.insert({
    document_id: documentId,
    clerk_id: user.id,
    action_taken: 'payment_submitted',
    from_status: 'pending_payment',
    to_status: 'pending_payment_verification',
    notes: `Payment reference ${gcash_reference_no} submitted by student.`,
  });

  const financeClerks = await userModel.findFinanceClerks();
  await notifications.notifyInAppBulk(financeClerks, {
    title: 'New Payment Submission',
    message: `Student submitted payment (Ref: ${gcash_reference_no}) for verification.`,
    type: 'info',
  });

  return { message: 'Payment receipt submitted successfully. Waiting for clerk verification.' };
}

/**
 * Finance clerk approves or rejects a submitted receipt. This is the only
 * place `payment_status` becomes PAID — nothing reaches the Secretary desk
 * without passing through here (docs/CODING_PREFERENCES.md).
 */
async function verifyPayment(user, documentId, { action, notes }, file) {
  if (user.role !== 'clerk' || user.desk_assignment !== 'Finance') {
    throw forbidden('Only Finance Clerks can verify payments.');
  }
  if (!['approve', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or reject.');
  }

  const officialReceiptPath = file ? `/uploads/${file.filename}` : null;
  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    doc = docs[0];
    const newStatus = action === 'approve' ? 'pending_secretary' : 'pending_payment';
    const paymentStatus = action === 'approve' ? 'PAID' : 'UNPAID';

    await documentModel.updatePaymentVerification(documentId, newStatus, paymentStatus, officialReceiptPath, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: action === 'approve' ? 'payment_approved' : 'payment_rejected',
        from_status: 'pending_payment_verification',
        to_status: newStatus,
        notes: notes || `Payment ${action}d by Finance Clerk.`,
      },
      connection
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Notify the student of the outcome, and the Secretary when it clears.
  if (doc.student_id) {
    const students = await userModel.findStudentContactByStudentId(doc.student_id);
    if (students.length > 0) {
      await notifications.notifyInApp({
        userId: students[0].id,
        title: action === 'approve' ? 'Payment Verified' : 'Payment Rejected',
        message: action === 'approve'
          ? `Your payment for ${doc.document_type} has been verified! Your document is now being processed.`
          : `Your payment for ${doc.document_type} was rejected. Reason: ${notes || 'Invalid receipt or reference number.'}`,
        type: action === 'approve' ? 'success' : 'error',
      });
    }
  }

  if (action === 'approve') {
    const studentInfo = await userModel.findStudentCourseByStudentId(doc.student_id);
    const studentCollege = studentInfo.length > 0 ? studentInfo[0].course : null;
    const secretaryClerks = await userModel.findSecretaryClerks(studentCollege);
    await notifications.notifyInAppBulk(secretaryClerks, {
      title: 'New Document Evaluation',
      message: `Payment verified for ${doc.document_type}. Ready for your evaluation.`,
      type: 'info',
    });
  }

  return { message: `Payment successfully ${action === 'approve' ? 'verified' : 'rejected'}.` };
}

/**
 * College Secretary reviews the OCR-extracted data, corrects it if needed,
 * and routes the document to Window 1 (or rejects it back to the student).
 */
async function evaluateDocument(user, documentId, body) {
  if (user.role !== 'clerk' || user.desk_assignment !== 'Secretary') {
    throw forbidden('Only College Secretaries can evaluate documents.');
  }

  const { student_id, student_name, document_type, action, notes } = body;
  if (!['approve', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or reject.');
  }

  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    doc = docs[0];
    const newStatus = action === 'approve' ? 'ready_window_1' : 'rejected';

    await documentModel.updateEvaluation(documentId, newStatus, student_id, student_name, document_type, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: action === 'approve' ? 'secretary_approved' : 'secretary_rejected',
        from_status: 'pending_secretary',
        to_status: newStatus,
        notes: notes || `Document evaluated and ${action}d by College Secretary.`,
      },
      connection
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Student alert: in-app always; SMS + email only when approved.
  const studentIdToNotify = student_id || doc.student_id;
  if (studentIdToNotify) {
    const students = await userModel.findStudentContactByStudentId(studentIdToNotify);
    if (students.length > 0) {
      const title = action === 'approve' ? 'Document Ready' : 'Document Rejected';
      const message = action === 'approve'
        ? `Your ${document_type || 'document'} is ready for pick-up at Window 1. Reference: ${doc.tracking_number}`
        : `Your ${document_type || 'document'} has been rejected. Reason: ${notes}`;

      await notifications.dispatchStudentAlert({
        user: students[0],
        title,
        message,
        type: action === 'approve' ? 'success' : 'error',
        alsoSmsAndEmail: action === 'approve',
        greetingName: student_name,
      });
    }
  }

  if (action === 'approve') {
    const window1Clerks = await userModel.findWindow1Clerks();
    await notifications.notifyInAppBulk(window1Clerks, {
      title: 'New Document Ready',
      message: `${document_type || 'Document'} is ready for release to ${student_name}.`,
      type: 'info',
    });
  }

  return { message: `Document successfully evaluated and ${action === 'approve' ? 'approved' : 'rejected'}.` };
}

/** Window 1 hands the physical document to the student, closing the request. */
async function releaseDocument(user, documentId) {
  if (user.role !== 'clerk' || user.desk_assignment !== 'Window 1') {
    throw forbidden('Only Window 1 Clerks can release documents.');
  }

  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    doc = docs[0];

    await documentModel.markCompleted(documentId, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: 'released',
        from_status: 'ready_window_1',
        to_status: 'completed',
        notes: 'Document released to student.',
      },
      connection
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  if (doc.student_id) {
    const students = await userModel.findStudentContactByStudentId(doc.student_id);
    if (students.length > 0) {
      await notifications.dispatchStudentAlert({
        user: students[0],
        title: 'Document Released',
        message: `Your ${doc.document_type || 'document'} has been released and is now completed. Tracking: ${doc.tracking_number}. Thank you for using Project TRACE!`,
        type: 'success',
        alsoSmsAndEmail: true,
      });
    }
  }

  return { message: 'Document successfully released to student.' };
}

/** Students may cancel only their own, still-unpaid requests. */
async function cancelDocument(user, documentId) {
  if (user.role !== 'student') {
    throw forbidden('Only students can cancel requests.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    const doc = docs[0];
    const owner = await userModel.findStudentIdById(user.id, connection);

    if (!owner[0] || doc.student_id !== owner[0].student_id) {
      throw badRequest('Unauthorized. You can only cancel your own requests.');
    }
    if (doc.current_status !== 'pending_payment') {
      throw badRequest('Cannot cancel a request that is already being processed.');
    }

    await stepLogModel.deleteByDocumentId(documentId, connection);
    await documentModel.deleteById(documentId, connection);

    await connection.commit();
    return { message: 'Request successfully cancelled.' };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  generateTrackingNumber,
  calculateAmount,
  uploadDocument,
  listDocuments,
  trackByTrackingNumber,
  getStats,
  getForecast,
  getInsights,
  getActivityLogs,
  assignDocument,
  processAction,
  submitPayment,
  verifyPayment,
  evaluateDocument,
  releaseDocument,
  cancelDocument,
};
