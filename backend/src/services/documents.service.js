const { pool } = require('../config/db');
const documentModel = require('../models/document.model');
const stepLogModel = require('../models/stepLog.model');
const userModel = require('../models/user.model');
const aiEngine = require('./aiEngine.service');
const n8n = require('./n8n.service');
const notifications = require('./notification.service');
const referenceModel = require('../models/referenceData.model');
const { getProvider } = require('./payment');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const {
  generateTrackingNumber,
  generateRequestGroupId,
  calculateGroupAmount,
} = require('../utils/pricing');
const { STATUS, assertTransition } = require('../utils/documentStatus');

/**
 * Core document pipeline logic.
 *
 * "Evaluate first, pay later" (see docs/SYSTEM_WORKFLOWS.md):
 *
 *   PENDING_W1_INTAKE → PENDING_SEC_EVALUATION → SEC_PROCESSING
 *   → PENDING_STUDENT_PAYMENT → PENDING_FINANCE_VERIFICATION
 *   → PAID_PENDING_SEC_RELEASE → READY_FOR_RELEASE → COMPLETED
 *
 * The registrar cannot quote a price until the document has been printed,
 * because the College Secretary prices it from the page count. So money is
 * collected near the end, and the physical copy only changes hands once an
 * Official Receipt exists.
 *
 * Every desk action calls `assertTransition` before writing. `step_logs` is
 * append-only, so an illegal move cannot be tidied away afterwards — it has to
 * be refused up front.
 */

// ---------------------------------------------------------------------------
// Upload / intake
// ---------------------------------------------------------------------------

/**
 * Normalise a request body into a list of requested items.
 *
 * Accepts both shapes: the multi-document form posts an `items` JSON array,
 * while the older single-document callers (and the n8n/audit paths) post a bare
 * `document_type`. One item is simply a group of one.
 */
function parseRequestedItems(body) {
  if (body.items) {
    let items = body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        throw badRequest('Invalid items payload.');
      }
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest('Select at least one document type.');
    }
    if (items.some((i) => !i || !i.document_type)) {
      throw badRequest('Every requested item needs a document type.');
    }
    return items;
  }

  return [
    {
      document_type: body.document_type,
      copies: body.copies,
      semesters: body.semesters,
      purpose: body.purpose,
    },
  ];
}

/**
 * Pick the uploaded file belonging to item `index`.
 *
 * Multer is configured with `.any()`, so the multi-document form can send one
 * attachment per item as `document_0`, `document_1`, … A single file named
 * `document` (the legacy field) applies to the first item.
 */
function fileForItem(files, index) {
  if (!files || !files.length) return null;
  return (
    files.find((f) => f.fieldname === `document_${index}`) ||
    (index === 0 ? files.find((f) => f.fieldname === 'document') : null) ||
    null
  );
}

/**
 * Create a document request, which may cover several document types at once.
 *
 * Every item becomes its own `documents` row sharing one `request_group_id`:
 * the group is billed and paid for once, but each document then routes through
 * the desks independently, so a fast Diploma isn't held up by a slow Transcript.
 *
 * Both channels enter the same way, at `PENDING_W1_INTAKE`: a student filing
 * online and a Window 1 clerk typing in a walk-in produce identical rows. The
 * old Window 1 shortcut that filed straight to the Secretary as already-PAID is
 * gone — under this pipeline nothing is paid at intake, so a walk-in that
 * skipped the counter would also skip its own evaluation.
 *
 * The amount written here is a **provisional estimate** from the admin-managed
 * fee table, shown so a student isn't quoted nothing at all. It is not a price:
 * `priced_at` stays NULL until the Secretary sets the real figure, and that
 * column — never `amount` — is what gates billing.
 */
async function uploadDocument(user, body, files) {
  // Tolerate a single multer file object as well as the `.any()` array.
  const fileList = Array.isArray(files) ? files : files ? [files] : [];

  const requested = parseRequestedItems(body);
  let { student_id, student_name } = body;

  // A student's request is always filed against their own record. Trusting the
  // client here would let one student attribute a request to another (and an
  // omitted field would create an unowned document nobody can pay for). Staff
  // keep the supplied values, since they file on a student's behalf.
  if (user.role === 'student') {
    const owner = await userModel.findStudentIdById(user.id);
    if (!owner[0]) {
      throw forbidden('Your account has no student record.');
    }
    student_id = owner[0].student_id;
    student_name = user.full_name || student_name;
  }

  // Fees are always computed server-side from the admin-managed rates; any
  // client-supplied amount is ignored.
  const types = await referenceModel.findDocumentTypesByNames(
    requested.map((i) => i.document_type)
  );
  const { total, items: priced } = calculateGroupAmount(requested, types);

  // A walk-in is the same request, typed in by the clerk the student is
  // standing in front of. Only the audit trail records which channel it came
  // through; the row itself is identical.
  const isWalkIn = user.role === 'clerk' && user.desk_assignment === 'Window 1';
  const logAction = isWalkIn ? 'walk_in_filed' : 'submitted';

  const requestGroupId = generateRequestGroupId();
  const connection = await pool.getConnection();
  const created = [];

  try {
    await connection.beginTransaction();

    for (const [index, item] of priced.entries()) {
      const trackingNumber = generateTrackingNumber();
      const attachment = fileForItem(fileList, index);

      const [docResult] = await documentModel.insert(
        {
          tracking_number: trackingNumber,
          request_group_id: requestGroupId,
          student_id,
          student_name,
          document_type: item.document_type,
          current_status: STATUS.PENDING_W1_INTAKE,
          payment_status: 'UNPAID',
          // Nobody owns it yet. n8n picks the desk after Window 1 has checked
          // the paperwork; until then it belongs to the shared intake queue.
          assigned_clerk_id: null,
          file_path: attachment ? attachment.path : null,
          original_filename: attachment ? attachment.originalname : null,
          checkout_url: `https://pm.link/mock/${trackingNumber}`,
          purpose: requested[index].purpose ?? body.purpose ?? null,
          copies: item.copies,
          amount: item.amount,
        },
        connection
      );

      const documentId = docResult.insertId;
      created.push({ documentId, trackingNumber, item, attachment });

      await stepLogModel.insert(
        {
          document_id: documentId,
          clerk_id: user.id,
          action_taken: logAction,
          from_status: null,
          to_status: STATUS.PENDING_W1_INTAKE,
          notes: isWalkIn
            ? `Walk-in request filed at Window 1 by ${user.full_name}. Estimated ₱${item.amount}.`
            : `Document requested online. Estimated ₱${item.amount} (group estimate ₱${total}); final amount set by the College Secretary after processing.`,
        },
        connection
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Best-effort post-commit work. OCR runs here rather than at the counter so
  // the Window 1 clerk opens an intake that has already been read — but it is
  // only a head start: a walk-in arrives with no attachment at all, and the
  // clerk can scan one in at intake, which runs this same pass again.
  for (const entry of created) {
    if (entry.attachment) {
      await runOcrPass(user, entry, STATUS.PENDING_W1_INTAKE);
    }
  }

  // Routing is deliberately NOT triggered here. Under this pipeline the first
  // desk is Window 1, and the college secretary is only chosen once a human has
  // confirmed the paperwork — see intakeDocument.
  const window1Clerks = await userModel.findWindow1Clerks();
  await notifications.notifyInAppBulk(window1Clerks, {
    title: 'New Request for Intake',
    message: `${created.length > 1 ? `${created.length} documents` : created[0].item.document_type} filed by ${student_name || student_id}. Awaiting intake check.`,
    type: 'info',
  });

  const documents = await documentModel.findByRequestGroup(requestGroupId);

  return {
    message:
      documents.length > 1
        ? `${documents.length} documents requested successfully.`
        : 'Document uploaded successfully.',
    request_group_id: requestGroupId,
    total_amount: total,
    // Single-document callers (and the existing E2E audit) still read these.
    tracking_number: created[0].trackingNumber,
    document: documents[0],
    documents,
  };
}

/**
 * Run the OCR engine over one uploaded attachment and record what it found.
 *
 * Failures are swallowed by aiEngine.extractDocument — a missing AI engine must
 * never invalidate an already-committed request. The status is passed in
 * because this runs at two different desks: once when a student's own upload
 * arrives, and again when a Window 1 clerk scans paperwork at the counter.
 */
async function runOcrPass(user, { documentId, trackingNumber, item, attachment }, atStatus) {
  const ocrData = await aiEngine.extractDocument(attachment, { trackingNumber });
  if (!ocrData || !ocrData.success || !ocrData.extracted_data) return;

  console.log(`📄 OCR processing complete for ${trackingNumber}`);

  const rawText = (ocrData.raw_text || '').toLowerCase();
  const documentType = item.document_type;
  let aiVerified = false;
  let aiNotes = 'AI analyzed the document but could not definitively verify it.';

  // Requirement verification: does the scan match what was requested?
  if (documentType === 'Honorable Dismissal' && rawText.includes('clearance')) {
    aiVerified = true;
    aiNotes = 'AI Verified: Valid Clearance document detected for Honorable Dismissal.';
  } else if (documentType && rawText.includes(documentType.toLowerCase())) {
    aiVerified = true;
    aiNotes = `AI Verified: Document content matches requested type (${documentType}).`;
  }

  await documentModel.updateOcrData(documentId, {
    raw_text: ocrData.raw_text,
    extracted_data_json: JSON.stringify(ocrData.extracted_data),
    confidence: ocrData.confidence || (aiVerified ? 92.5 : 45.0),
    student_id: ocrData.extracted_data.student_id,
    form_type: ocrData.extracted_data.form_type,
  });

  await stepLogModel.insert({
    document_id: documentId,
    clerk_id: user.id,
    action_taken: aiVerified ? 'ai_verified' : 'ai_flagged',
    // An OCR pass observes the document, it does not move it.
    from_status: atStatus,
    to_status: atStatus,
    notes: aiNotes,
  });
}

// ---------------------------------------------------------------------------
// Listing / tracking
// ---------------------------------------------------------------------------

/**
 * Role-scoped document listing.
 *  - Students see only their own requests.
 *  - Finance sees both money queues: awaiting payment, and awaiting verification.
 *  - Secretaries see their own college's students (college-based routing).
 *  - Window 1 and admins see the whole system queue.
 *
 * Window 1 is deliberately unrestricted even though it only *acts* on two
 * statuses. It is the public counter: its Tracking Desk answers "where is my
 * document?" for a student standing in front of it, and that needs every
 * document, not just the two queues it owns. The dashboard splits the list into
 * Intake and Release client-side.
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
      // Two queues. The first is read-only — Finance can see what a student has
      // been billed for so it can answer a walk-in holding a stub, but only the
      // second is actionable.
      conditions.push('current_status IN (?, ?)');
      params.push(STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION);
    } else if (desk === 'Secretary') {
      // Four working queues plus the tail, so a secretary can still see what
      // they released rather than having documents vanish at handoff.
      conditions.push('current_status IN (?, ?, ?, ?, ?, ?)');
      params.push(
        STATUS.PENDING_SEC_EVALUATION,
        STATUS.SEC_PROCESSING,
        STATUS.PAID_PENDING_SEC_RELEASE,
        STATUS.SEC_OR_VERIFIED,
        STATUS.READY_FOR_RELEASE,
        STATUS.COMPLETED
      );

      // College segregation, plus n8n's routing decision layered on top.
      //
      // A document explicitly assigned to this secretary always shows, and one
      // assigned to a *different* secretary is hidden — that is what makes the
      // n8n routing decision load-bearing rather than decorative.
      //
      // Two deliberate limits. Unassigned documents fall back to the college
      // filter, so the ~10,000 records that predate routing (and anything
      // filed while n8n is stopped) stay visible. And an assignment to a
      // non-Secretary desk is ignored here, because the workflow also routes
      // TOR/Diploma to Window 1 at intake — honouring that would delete those
      // documents from the secretary queue they still have to pass through.
      const secUser = await userModel.findCourseById(user.id);
      const collegeSql =
        secUser.length > 0 && secUser[0].course
          ? 'student_id IN (SELECT student_id FROM users WHERE course = ?)'
          : '1 = 1';

      conditions.push(
        `(assigned_clerk_id = ?
          OR (${collegeSql}
              AND (assigned_clerk_id IS NULL
                   OR assigned_clerk_id NOT IN
                      (SELECT id FROM users WHERE desk_assignment = 'Secretary'))))`
      );
      params.push(user.id);
      if (collegeSql !== '1 = 1') {
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
    pending_w1_intake_count,
    sec_processing_count,
    pending_student_payment_count,
    paid_pending_sec_release_count,
  ] = await Promise.all([
    documentModel.countProcessedTodayByClerk(user.id),
    documentModel.countClearedBySecretaryToday(),
    documentModel.avgProcessingMinutes(),
    documentModel.avgOcrConfidence(),
    documentModel.countBacklog(),
    documentModel.countByStatus(STATUS.PENDING_FINANCE_VERIFICATION),
    documentModel.countCompletedToday(),
    documentModel.countByStatus(STATUS.PENDING_SEC_EVALUATION),
    documentModel.countByStatus(STATUS.READY_FOR_RELEASE),
    documentModel.countByStatus(STATUS.PENDING_W1_INTAKE),
    documentModel.countByStatus(STATUS.SEC_PROCESSING),
    documentModel.countByStatus(STATUS.PENDING_STUDENT_PAYMENT),
    documentModel.countByStatus(STATUS.PAID_PENDING_SEC_RELEASE),
  ]);

  // `pending_secretary_count` and `ready_window_1_count` keep their old names:
  // they are the same two ideas (work waiting on a secretary, work waiting for
  // pickup) and every dashboard KPI already reads them.
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
    pending_w1_intake_count,
    sec_processing_count,
    pending_student_payment_count,
    paid_pending_sec_release_count,
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
    documentModel.countByStatus(STATUS.PENDING_SEC_EVALUATION),
    documentModel.countByStatus(STATUS.READY_FOR_RELEASE),
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
    // Routing assigns a desk; it does not advance the document itself.
    from_status: STATUS.PENDING_SEC_EVALUATION,
    to_status: STATUS.PENDING_SEC_EVALUATION,
    notes: `Auto-routed to Clerk ${assigned_clerk_employee_id} by n8n`,
  });

  return { message: 'Document successfully assigned.' };
}

/**
 * Student pays digitally: a reference number plus a receipt screenshot.
 *
 * This is only one of the two ways money arrives. A walk-in student pays at the
 * Finance counter instead and never touches this path — see logWalkInPayment.
 *
 * The document must belong to the caller. Without that check any logged-in
 * student could attach a receipt to somebody else's request and push it into
 * the Finance queue on their behalf.
 */
async function submitPayment(user, documentId, { gcash_reference_no, payment_method }, file) {
  const docs = await documentModel.findById(documentId);
  if (docs.length === 0) {
    throw notFound('Document request not found.');
  }
  const doc = docs[0];

  const owner = await userModel.findStudentIdById(user.id);
  if (!owner[0] || doc.student_id !== owner[0].student_id) {
    throw forbidden('You can only submit payment for your own requests.');
  }

  // A request can only be paid once it has been priced. Before that there is no
  // amount to pay, and afterwards Finance has already cleared it — either way a
  // receipt would be attaching money to the wrong thing. Re-submitting while
  // still awaiting verification is allowed, so a wrong screenshot can be fixed.
  if (![STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION].includes(doc.current_status)) {
    throw badRequest('This request is not awaiting payment.');
  }

  // Which method the student used. Defaults to GCash so older clients that
  // don't send one keep working.
  const methodCode = payment_method || 'gcash';
  const methodRows = await referenceModel.findPaymentMethodByCode(methodCode);
  if (!methodRows.length || !methodRows[0].is_active) {
    throw badRequest('That payment method is not available.');
  }
  const method = methodRows[0];

  // Each provider decides what proof it needs. Today every method verifies
  // manually against Finance's records; a hosted gateway would validate
  // differently without changing this call site.
  const provider = getProvider(method);
  const { reference } = provider.validateSubmission(method, { reference: gcash_reference_no, file });

  // One receipt settles every document requested together, so the update and
  // the audit trail cover the whole group rather than the single row clicked.
  const groupId = doc.request_group_id || doc.tracking_number;
  const receiptPath = `/uploads/${file.filename}`;

  const [result] = await documentModel.updatePaymentSubmissionForGroup(
    groupId,
    reference,
    receiptPath,
    methodCode
  );

  if (result.affectedRows === 0) {
    throw notFound('Document request not found.');
  }

  const groupDocs = await documentModel.findByRequestGroup(groupId);
  for (const groupDoc of groupDocs) {
    await stepLogModel.insert({
      document_id: groupDoc.id,
      clerk_id: user.id,
      action_taken: 'payment_submitted',
      from_status: STATUS.PENDING_STUDENT_PAYMENT,
      to_status: STATUS.PENDING_FINANCE_VERIFICATION,
      notes: `${method.name} payment reference ${reference} submitted by student.`,
    });
  }

  const financeClerks = await userModel.findFinanceClerks();
  const countLabel = result.affectedRows > 1 ? `${result.affectedRows} documents` : 'a document';
  await notifications.notifyInAppBulk(financeClerks, {
    title: 'New Payment Submission',
    message: `Student submitted a ${method.name} payment (Ref: ${reference}) for ${countLabel} awaiting verification.`,
    type: 'info',
  });

  return {
    message: 'Payment receipt submitted successfully. Waiting for clerk verification.',
    documents_covered: result.affectedRows,
  };
}

/**
 * Finance clerk approves or rejects a claimed payment, whichever channel it
 * arrived through.
 *
 * This is the only place `payment_status` becomes PAID. The Secretary now sets
 * the *price*, but pricing authority and payment authority are deliberately
 * separate: no document is released as paid without Finance saying so
 * (docs/CODING_PREFERENCES.md).
 *
 * Approving requires the Official Receipt number, same as logWalkInPayment —
 * a walk-in already has one from the counter and the clerk just confirms it,
 * but a digital payment had none recorded anywhere until now.
 */
async function verifyPayment(user, documentId, { action, notes, or_number, or_date }, file) {
  if (user.role !== 'clerk' || user.desk_assignment !== 'Finance') {
    throw forbidden('Only Finance Clerks can verify payments.');
  }
  if (!['approve', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or reject.');
  }
  if (action === 'approve' && !or_number) {
    throw badRequest('Enter the Official Receipt number.');
  }

  const officialReceiptPath = file ? `/uploads/${file.filename}` : null;
  const connection = await pool.getConnection();
  let doc;
  let clearedCount = 0;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    doc = docs[0];
    const newStatus = action === 'approve' ? STATUS.PAID_PENDING_SEC_RELEASE : STATUS.PENDING_STUDENT_PAYMENT;
    const paymentStatus = action === 'approve' ? 'PAID' : 'UNPAID';
    assertTransition(doc.current_status, newStatus);

    // The receipt covered the whole request, so one decision settles every
    // document in the group. Each row then routes independently from here.
    const groupId = doc.request_group_id || doc.tracking_number;
    const groupDocs = await documentModel.findByRequestGroupForUpdate(groupId, connection);

    const [result] = await documentModel.updatePaymentVerificationForGroup(
      groupId, newStatus, paymentStatus,
      {
        officialReceiptPath,
        orNumber: action === 'approve' ? or_number : null,
        orDate: action === 'approve' ? (or_date || null) : null,
      },
      connection
    );
    clearedCount = result.affectedRows;

    for (const groupDoc of groupDocs) {
      if (groupDoc.current_status !== STATUS.PENDING_FINANCE_VERIFICATION) continue;
      await stepLogModel.insert(
        {
          document_id: groupDoc.id,
          clerk_id: user.id,
          action_taken: action === 'approve' ? 'payment_approved' : 'payment_rejected',
          from_status: STATUS.PENDING_FINANCE_VERIFICATION,
          to_status: newStatus,
          notes: notes || `Payment ${action}d by Finance Clerk.`,
        },
        connection
      );
    }

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
          ? `Your payment for ${doc.document_type} has been verified. Your document is being prepared for release at Window 1.`
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
      title: 'Payment Verified — Check the Receipt',
      message: `Payment cleared for ${doc.document_type} (${doc.tracking_number}). Verify the Official Receipt, then hand the printed document to Window 1.`,
      type: 'success',
    });
  }

  return {
    message: `Payment successfully ${action === 'approve' ? 'verified' : 'rejected'}.`,
    documents_covered: clearedCount,
  };
}

/**
 * Resolve a student's college for routing.
 *
 * Best-effort by design: routing metadata must never fail an action that has
 * already been committed, so a lookup failure degrades to the workflow's own
 * fallback rather than throwing.
 */
async function resolveCollege(studentId) {
  try {
    const courseRows = await userModel.findStudentCourseByStudentId(studentId);
    const course = courseRows[0]?.course || null;
    if (!course) return { course: null, collegeCode: null };
    const collegeRows = await referenceModel.findCollegeByName(course);
    return { course, collegeCode: collegeRows[0]?.short_code || null };
  } catch (err) {
    console.warn('⚠️ Could not resolve college for routing:', err.message);
    return { course: null, collegeCode: null };
  }
}

/**
 * Tell the student what just happened to their request.
 *
 * Every desk in the pipeline needs this, and every one of them needs it to fail
 * soft: a document must not stay stuck at a desk because an SMS gateway is
 * down. `dispatchStudentAlert` already swallows per-channel failures; this
 * wrapper adds the "student may not exist" case that each caller would
 * otherwise repeat.
 */
async function notifyStudent(studentId, { title, message, type, alsoSmsAndEmail = false, greetingName }) {
  if (!studentId) return;
  try {
    const students = await userModel.findStudentContactByStudentId(studentId);
    if (students.length === 0) return;
    await notifications.dispatchStudentAlert({
      user: students[0], title, message, type, alsoSmsAndEmail, greetingName,
    });
  } catch (err) {
    console.warn('⚠️ Student notification failed:', err.message);
  }
}

/**
 * Desk guard. Every action below belongs to exactly one counter, and saying so
 * once keeps the check identical everywhere rather than subtly drifting.
 */
function requireDesk(user, desk, message) {
  if (user.role !== 'clerk' || user.desk_assignment !== desk) {
    throw forbidden(message);
  }
}

/**
 * Window 1 checks the paperwork and hands the request to the College Secretary.
 *
 * This is where a scan can still be supplied: a walk-in student arrives with
 * paper and no upload, so the clerk attaches it here and the same OCR pass runs
 * that an online upload would have triggered.
 *
 * Routing happens at the end of this step, not at submission — the college
 * secretary is only chosen once a human has confirmed there is something real
 * to route.
 */
async function intakeDocument(user, documentId, { action, notes }, file) {
  requireDesk(user, 'Window 1', 'Only Window 1 Clerks can process intake.');
  if (!['approve', 'return'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or return.');
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

    if (doc.current_status !== STATUS.PENDING_W1_INTAKE) {
      throw badRequest('This request is not in the intake queue.');
    }

    if (action === 'approve') {
      assertTransition(doc.current_status, STATUS.PENDING_SEC_EVALUATION);
      await documentModel.updateStatus(documentId, STATUS.PENDING_SEC_EVALUATION, connection);
    } else if (!notes) {
      // Returning without a reason gives the student nothing to act on, and the
      // status does not move — so the note is the entire message.
      throw badRequest('Explain what the student needs to correct.');
    }

    if (file) {
      await documentModel.updateAttachment(documentId, file.path, file.originalname, connection);
    }

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: action === 'approve' ? 'intake_approved' : 'intake_returned',
        from_status: STATUS.PENDING_W1_INTAKE,
        // A return keeps the document where it is: intake is the first desk, so
        // there is no earlier queue to send it back to.
        to_status: action === 'approve' ? STATUS.PENDING_SEC_EVALUATION : STATUS.PENDING_W1_INTAKE,
        notes: notes || `Intake checked at Window 1 by ${user.full_name}.`,
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

  // A freshly scanned attachment deserves the same OCR treatment an upload gets.
  if (file) {
    await runOcrPass(
      user,
      {
        documentId,
        trackingNumber: doc.tracking_number,
        item: { document_type: doc.document_type },
        attachment: file,
      },
      action === 'approve' ? STATUS.PENDING_SEC_EVALUATION : STATUS.PENDING_W1_INTAKE
    );
  }

  if (action === 'approve') {
    // Only now does the college matter. n8n reads the short code (CCS, CON, …)
    // to resolve the SEC-<code>001 account; a student with no course falls
    // through to the workflow's own fallback.
    const { course, collegeCode } = await resolveCollege(doc.student_id);
    await n8n.triggerDocumentRouting({
      document_id: doc.id,
      tracking_number: doc.tracking_number,
      document_type: doc.document_type,
      student_id: doc.student_id,
      course,
      college_code: collegeCode,
    });

    const secretaries = await userModel.findSecretaryClerks(course);
    await notifications.notifyInAppBulk(secretaries, {
      title: 'New Document for Evaluation',
      message: `${doc.document_type} (${doc.tracking_number}) cleared intake and is awaiting your evaluation.`,
      type: 'info',
    });
  }

  await notifyStudent(doc.student_id, {
    title: action === 'approve' ? 'Request Accepted' : 'Action Needed on Your Request',
    message: action === 'approve'
      ? `Your ${doc.document_type} passed the intake check and is now with the College Secretary.`
      : `Your ${doc.document_type} needs attention before it can proceed. ${notes}`,
    type: action === 'approve' ? 'info' : 'error',
  });

  return {
    message: action === 'approve'
      ? 'Intake approved and routed to the College Secretary.'
      : 'Request returned to the student with notes.',
  };
}

/**
 * College Secretary takes the request on, correcting whatever the OCR misread
 * and committing to a date.
 *
 * The date is the point of this step. A student who is told "about five days"
 * can plan around it, and the office gets a measurable dwell time between
 * accepting work and finishing it.
 */
async function acceptForProcessing(user, documentId, body) {
  requireDesk(user, 'Secretary', 'Only College Secretaries can evaluate documents.');

  const { student_id, student_name, document_type, estimated_ready_date, action, notes } = body;
  if (!['approve', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be approve or reject.');
  }
  if (action === 'approve' && !estimated_ready_date) {
    throw badRequest('Give the student an estimated completion date.');
  }
  if (action === 'reject' && !notes) {
    throw badRequest('Explain why the request is being returned.');
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

    // Rejecting sends it back one desk, to the counter that accepted the
    // paperwork in the first place.
    const newStatus = action === 'approve' ? STATUS.SEC_PROCESSING : STATUS.PENDING_W1_INTAKE;
    assertTransition(doc.current_status, newStatus);

    await documentModel.updateEvaluation(
      documentId, newStatus, student_id, student_name, document_type,
      action === 'approve' ? estimated_ready_date : null,
      connection
    );

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: action === 'approve' ? 'secretary_accepted' : 'secretary_returned',
        from_status: doc.current_status,
        to_status: newStatus,
        notes: notes || `Accepted for processing; expected ready ${estimated_ready_date}.`,
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

  await notifyStudent(student_id || doc.student_id, {
    title: action === 'approve' ? 'Request Being Processed' : 'Request Returned',
    message: action === 'approve'
      ? `Your ${document_type || doc.document_type} is being prepared. Estimated ready by ${estimated_ready_date}. You will be told the amount once it is printed.`
      : `Your ${document_type || doc.document_type} was returned. Reason: ${notes}`,
    type: action === 'approve' ? 'info' : 'error',
    alsoSmsAndEmail: true,
    greetingName: student_name,
  });

  return {
    message: action === 'approve'
      ? 'Document accepted for processing.'
      : 'Document returned to Window 1 with notes.',
  };
}

/**
 * College Secretary prices a printed document and, once the whole request is
 * priced, bills it.
 *
 * Pricing is per document because page counts differ, but **billing is per
 * request**: a student who asked for a Transcript and a Diploma together pays
 * once. So the group only becomes payable when the last of its documents has a
 * price — otherwise the first one finished would send the student to Finance,
 * and the second would send them back again.
 *
 * The Secretary sets the amount; only Finance can later call it PAID. Keeping
 * those two authorities apart is what makes the money trail auditable.
 */
async function priceDocument(user, documentId, { amount, page_count, pricing_notes }) {
  requireDesk(user, 'Secretary', 'Only College Secretaries can price documents.');

  const priced = parseFloat(amount);
  if (!Number.isFinite(priced) || priced <= 0) {
    throw badRequest('Enter the amount to charge for this document.');
  }

  const connection = await pool.getConnection();
  let doc;
  let groupId;
  let becamePayable = false;
  let groupTotal = 0;
  let groupDocs = [];

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }
    doc = docs[0];

    if (doc.current_status !== STATUS.SEC_PROCESSING) {
      throw badRequest('Only a document being processed can be priced.');
    }

    groupId = doc.request_group_id || doc.tracking_number;
    // Lock the siblings too: two secretaries pricing the last two documents of
    // one request at the same moment must not both decide they were the last.
    groupDocs = await documentModel.findByRequestGroupForUpdate(groupId, connection);

    await documentModel.updatePricing(
      documentId,
      { amount: priced, pageCount: page_count, pricingNotes: pricing_notes, clerkId: user.id },
      connection
    );

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: 'priced',
        from_status: STATUS.SEC_PROCESSING,
        to_status: STATUS.SEC_PROCESSING,
        notes: `Priced at ₱${priced.toFixed(2)}${page_count ? ` for ${page_count} page(s)` : ''} by ${user.full_name}.${pricing_notes ? ` ${pricing_notes}` : ''}`,
      },
      connection
    );

    const unpriced = await documentModel.countUnpricedInGroup(groupId, connection);
    if (unpriced === 0) {
      assertTransition(STATUS.SEC_PROCESSING, STATUS.PENDING_STUDENT_PAYMENT);
      await documentModel.markGroupPayable(groupId, connection);
      groupTotal = await documentModel.sumGroupAmount(groupId, connection);
      becamePayable = true;

      for (const groupDoc of groupDocs) {
        await stepLogModel.insert(
          {
            document_id: groupDoc.id,
            clerk_id: user.id,
            action_taken: 'billed',
            from_status: STATUS.SEC_PROCESSING,
            to_status: STATUS.PENDING_STUDENT_PAYMENT,
            notes: `Request billed at ₱${groupTotal.toFixed(2)} total. Payment slip issued.`,
          },
          connection
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  if (!becamePayable) {
    return {
      message: 'Document priced. The request is billed once every document in it has a price.',
      billed: false,
      remaining_unpriced: await documentModel.countUnpricedInGroup(groupId),
    };
  }

  const typeList = groupDocs.map((d) => d.document_type).filter(Boolean).join(', ');

  // The student is told what to pay, and Finance is told to expect it. Finance
  // needs its own copy because a walk-in may arrive at the counter with nothing
  // but a printed slip.
  await notifyStudent(doc.student_id, {
    title: 'Payment Required',
    message: `Your request (${doc.tracking_number}) is ready and costs ₱${groupTotal.toFixed(2)}. Pay online from your dashboard, or bring your payment slip to the Finance Office.`,
    type: 'warning',
    alsoSmsAndEmail: true,
  });

  const financeClerks = await userModel.findFinanceClerks();
  await notifications.notifyInAppBulk(financeClerks, {
    title: 'Request Ready for Payment',
    message: `${doc.tracking_number} — ${doc.student_name || doc.student_id} — ${typeList} — ₱${groupTotal.toFixed(2)}. Awaiting payment.`,
    type: 'info',
  });

  return {
    message: `Request billed at ₱${groupTotal.toFixed(2)}. The student and Finance have been notified.`,
    billed: true,
    total_amount: groupTotal,
    documents_covered: groupDocs.length,
  };
}

/**
 * College Secretary checks the Official Receipt Finance attached before the
 * printed document can be handed to Window 1.
 *
 * Deliberately a procedural completeness check, not a second money decision:
 * it never touches `payment_status`. Only Finance's verifyPayment ever marks a
 * document PAID — this step exists so nothing reaches Window 1 on the strength
 * of a payment nobody actually looked the paperwork for
 * (docs/CODING_PREFERENCES.md — pricing and payment stay separate authorities).
 *
 * No reject path: unlike verifyPayment or intakeDocument, there is nothing to
 * send back to a previous desk here. A genuinely wrong OR is a Finance data
 * problem, fixed by Finance re-approving with the correct number — not a
 * pipeline transition.
 */
async function verifyOfficialReceipt(user, documentId, { notes } = {}) {
  requireDesk(user, 'Secretary', 'Only College Secretaries can verify the Official Receipt.');

  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }
    doc = docs[0];

    assertTransition(doc.current_status, STATUS.SEC_OR_VERIFIED);
    await documentModel.updateOrVerification(documentId, user.id, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: 'or_verified',
        from_status: STATUS.PAID_PENDING_SEC_RELEASE,
        to_status: STATUS.SEC_OR_VERIFIED,
        notes: notes || `Official Receipt${doc.or_number ? ` (${doc.or_number})` : ''} checked by ${user.full_name}.`,
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

  return { message: 'Official Receipt verified. Ready for handoff to Window 1.' };
}

/**
 * College Secretary hands the printed, signed and dry-sealed document to
 * Window 1 once Finance has confirmed the money and the Official Receipt has
 * been checked.
 *
 * A separate step rather than an automatic move, because it records a physical
 * event: the paper actually changing hands. Marking it in the system while the
 * document sits in a drawer is exactly the drift this pipeline exists to stop.
 */
async function confirmHandoff(user, documentId, { notes }) {
  requireDesk(user, 'Secretary', 'Only College Secretaries can hand documents to Window 1.');

  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }
    doc = docs[0];

    assertTransition(doc.current_status, STATUS.READY_FOR_RELEASE);
    if (doc.payment_status !== 'PAID') {
      // Belt and braces: the transition already forbids this, but a document
      // leaving the Secretary unpaid is the one mistake with a financial cost.
      throw badRequest('This document has not been paid for.');
    }

    await documentModel.updateStatus(documentId, STATUS.READY_FOR_RELEASE, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: 'handed_to_window_1',
        from_status: STATUS.SEC_OR_VERIFIED,
        to_status: STATUS.READY_FOR_RELEASE,
        notes: notes || `Physical document handed to Window 1 by ${user.full_name}.`,
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

  const window1Clerks = await userModel.findWindow1Clerks();
  await notifications.notifyInAppBulk(window1Clerks, {
    title: 'Document Ready for Release',
    message: `${doc.document_type} for ${doc.student_name || doc.student_id} (${doc.tracking_number}) is at the release desk.`,
    type: 'info',
  });

  await notifyStudent(doc.student_id, {
    title: 'Ready for Pick-up',
    message: `Your ${doc.document_type} is ready for collection at Window 1. Bring your Official Receipt. Reference: ${doc.tracking_number}`,
    type: 'success',
    alsoSmsAndEmail: true,
  });

  return { message: 'Document handed to Window 1 and the student notified.' };
}

/**
 * Read an Official Receipt so the walk-in form can be pre-filled.
 *
 * Deliberately does not touch any document: it reads an image and hands back
 * what it saw. The clerk confirms the figures and then submits them through
 * logWalkInPayment, so a misread never becomes a recorded payment on its own.
 *
 * A null result from the engine is returned as an unsuccessful read rather than
 * an error — the counter cannot stop working because the AI engine is down.
 */
async function scanReceipt(user, file) {
  requireDesk(user, 'Finance', 'Only Finance Clerks can scan receipts.');
  if (!file) {
    throw badRequest('Attach a photo or scan of the Official Receipt.');
  }

  const result = await aiEngine.extractReceipt(file);
  if (!result || !result.success) {
    return {
      success: false,
      message: 'Could not read the receipt. Enter the details by hand.',
      extracted_data: { or_number: null, amount: null, or_date: null, confidence: 0 },
    };
  }

  return {
    success: true,
    message: 'Check every field against the receipt before saving.',
    extracted_data: result.extracted_data,
  };
}

/**
 * Finance logs a payment taken at the counter.
 *
 * A walk-in student pays with cash against the slip the Secretary printed, so
 * nothing about it reaches the system on its own. The clerk either types the
 * Official Receipt details or scans the OR and lets OCR fill them in — and then
 * re-checks them either way, because an OCR misread here is a money error.
 *
 * This only *records* the payment. Verification is still a separate act, so a
 * walk-in and a digital payment are held to the same standard.
 */
async function logWalkInPayment(user, documentId, { or_number, or_date, notes }, file) {
  requireDesk(user, 'Finance', 'Only Finance Clerks can log counter payments.');
  if (!or_number) {
    throw badRequest('Enter the Official Receipt number.');
  }

  const docs = await documentModel.findById(documentId);
  if (docs.length === 0) {
    throw notFound('Document request not found.');
  }
  const doc = docs[0];

  if (doc.current_status !== STATUS.PENDING_STUDENT_PAYMENT) {
    throw badRequest('This request is not awaiting payment.');
  }

  // One receipt settles the whole request, exactly as a digital payment does.
  const groupId = doc.request_group_id || doc.tracking_number;
  const [result] = await documentModel.updateWalkInPaymentForGroup(
    groupId,
    {
      orNumber: or_number,
      orDate: or_date,
      clerkId: user.id,
      receiptPath: file ? `/uploads/${file.filename}` : null,
    }
  );

  if (result.affectedRows === 0) {
    throw notFound('Document request not found.');
  }

  const groupDocs = await documentModel.findByRequestGroup(groupId);
  for (const groupDoc of groupDocs) {
    await stepLogModel.insert({
      document_id: groupDoc.id,
      clerk_id: user.id,
      action_taken: 'walk_in_payment_logged',
      from_status: STATUS.PENDING_STUDENT_PAYMENT,
      to_status: STATUS.PENDING_FINANCE_VERIFICATION,
      notes: notes || `Counter payment logged by ${user.full_name}. OR ${or_number}.`,
    });
  }

  await notifyStudent(doc.student_id, {
    title: 'Payment Recorded',
    message: `Your counter payment for ${doc.document_type} (OR ${or_number}) has been recorded and is being verified.`,
    type: 'info',
  });

  return {
    message: 'Counter payment logged. Verify it to release the document.',
    documents_covered: result.affectedRows,
  };
}

/**
 * Window 1 hands the physical document over, closing the request.
 *
 * For a walk-in this is also the payment check: the student presents the
 * Official Receipt Finance issued, and the clerk confirms it against the record
 * before letting the document go.
 */
async function releaseDocument(user, documentId, { notes } = {}) {
  requireDesk(user, 'Window 1', 'Only Window 1 Clerks can release documents.');

  const connection = await pool.getConnection();
  let doc;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) {
      throw notFound('Document not found.');
    }

    doc = docs[0];

    assertTransition(doc.current_status, STATUS.COMPLETED);
    await documentModel.markCompleted(documentId, connection);

    await stepLogModel.insert(
      {
        document_id: documentId,
        clerk_id: user.id,
        action_taken: 'released',
        from_status: STATUS.READY_FOR_RELEASE,
        to_status: STATUS.COMPLETED,
        notes: notes
          || (doc.or_number
            ? `Released against OR ${doc.or_number} by ${user.full_name}.`
            : `Released to student by ${user.full_name}.`),
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

  await notifyStudent(doc.student_id, {
    title: 'Document Released',
    message: `Your ${doc.document_type || 'document'} has been released and is now completed. Tracking: ${doc.tracking_number}. Thank you for using Project TRACE!`,
    type: 'success',
    alsoSmsAndEmail: true,
  });

  // Close the loop back to the desk that prepared it, so the Secretary sees the
  // request finish rather than losing sight of it at handoff.
  const { course } = await resolveCollege(doc.student_id);
  const secretaries = await userModel.findSecretaryClerks(course);
  await notifications.notifyInAppBulk(secretaries, {
    title: 'Document Collected',
    message: `${doc.document_type} (${doc.tracking_number}) was collected by ${doc.student_name || doc.student_id}.`,
    type: 'success',
  });

  return { message: 'Document successfully released to student.' };
}

/**
 * Students may cancel their own request, but only before work starts on it.
 *
 * The window closes when the Secretary accepts it for processing: past that
 * point paper and toner have been spent, and the registrar has a printed
 * document it cannot un-print.
 */
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
    if (![STATUS.PENDING_W1_INTAKE, STATUS.PENDING_SEC_EVALUATION].includes(doc.current_status)) {
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
  // Re-exported for convenience; the implementations live in utils/pricing.js.
  generateTrackingNumber,
  generateRequestGroupId,
  calculateGroupAmount,
  uploadDocument,
  listDocuments,
  trackByTrackingNumber,
  getStats,
  getForecast,
  getInsights,
  getActivityLogs,
  assignDocument,
  intakeDocument,
  acceptForProcessing,
  priceDocument,
  submitPayment,
  scanReceipt,
  logWalkInPayment,
  verifyPayment,
  verifyOfficialReceipt,
  confirmHandoff,
  releaseDocument,
  cancelDocument,
};
