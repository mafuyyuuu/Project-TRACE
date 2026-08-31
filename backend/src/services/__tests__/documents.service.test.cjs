/**
 * Covers the document pipeline's authorization rules and status transitions —
 * including the IDOR fix, where any logged-in student could previously attach a
 * receipt to another student's request.
 */
const documentModel = require('../../models/document.model');
const stepLogModel = require('../../models/stepLog.model');
const userModel = require('../../models/user.model');
const notifications = require('../notification.service');
const aiEngine = require('../aiEngine.service');
const n8n = require('../n8n.service');
const { STATUS } = require('../../utils/documentStatus');
const referenceModel = require('../../models/referenceData.model');
const { pool } = require('../../config/db');
const service = require('../documents.service');

const STUDENT = { id: 3, role: 'student', full_name: 'Ana Reyes' };
const FINANCE = { id: 4, role: 'clerk', desk_assignment: 'Finance', full_name: 'Finance Officer' };
const SECRETARY = { id: 5, role: 'clerk', desk_assignment: 'Secretary', full_name: 'Secretary' };
const WINDOW1 = { id: 6, role: 'clerk', desk_assignment: 'Window 1', full_name: 'Window 1 Clerk' };
const ADMIN = { id: 7, role: 'admin', full_name: 'Registrar Admin' };

const RECEIPT = { filename: 'receipt.png' };
const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

/** A stand-in transaction connection so services never reach a real database. */
function fakeConnection(docRow) {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn().mockResolvedValue([docRow ? [docRow] : [], []]),
  };
}

let connection;

beforeEach(() => {
  connection = fakeConnection();
  vi.spyOn(pool, 'getConnection').mockImplementation(async () => connection);

  vi.spyOn(documentModel, 'findById').mockResolvedValue([]);
  vi.spyOn(documentModel, 'findByIdForUpdate').mockResolvedValue([]);
  // Group-aware payment paths: one receipt settles every document requested together.
  vi.spyOn(documentModel, 'updatePaymentSubmissionForGroup').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'updatePaymentVerificationForGroup').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'updateWalkInPaymentForGroup').mockResolvedValue([{ affectedRows: 1 }]);
  // Evaluate-first pipeline writes.
  vi.spyOn(documentModel, 'updateStatus').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'updateAttachment').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'updatePricing').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'markGroupPayable').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'sumGroupAmount').mockResolvedValue(0);
  // Default: this was the last unpriced document, so pricing bills the group.
  vi.spyOn(documentModel, 'countUnpricedInGroup').mockResolvedValue(0);
  vi.spyOn(documentModel, 'findByRequestGroup').mockResolvedValue([]);
  vi.spyOn(documentModel, 'findByRequestGroupForUpdate').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findDocumentTypesByNames').mockResolvedValue([]);
  // Payment methods are reference data; GCash is the default the student sees.
  vi.spyOn(referenceModel, 'findPaymentMethodByCode').mockResolvedValue([
    { id: 1, code: 'gcash', name: 'GCash', provider: 'manual', is_active: 1,
      requires_reference: 1, reference_label: 'GCash Reference Number', requires_proof: 1 },
  ]);
  vi.spyOn(documentModel, 'updateEvaluation').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'markCompleted').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'deleteById').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'countWithFilters').mockResolvedValue(0);
  vi.spyOn(documentModel, 'listWithFilters').mockResolvedValue([]);
  vi.spyOn(documentModel, 'countByStatus').mockResolvedValue(0);
  vi.spyOn(documentModel, 'countStepLogsToday').mockResolvedValue(0);
  vi.spyOn(documentModel, 'forecastFallbackRows').mockResolvedValue([]);

  vi.spyOn(stepLogModel, 'insert').mockResolvedValue([{}]);
  vi.spyOn(stepLogModel, 'deleteByDocumentId').mockResolvedValue([{}]);

  vi.spyOn(userModel, 'findStudentIdById').mockResolvedValue([{ student_id: 'STU-001' }]);
  vi.spyOn(userModel, 'findCourseById').mockResolvedValue([]);
  vi.spyOn(userModel, 'findFinanceClerks').mockResolvedValue([]);
  vi.spyOn(userModel, 'findSecretaryClerks').mockResolvedValue([]);
  vi.spyOn(userModel, 'findWindow1Clerks').mockResolvedValue([]);
  vi.spyOn(userModel, 'findStudentContactByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'findStudentCourseByStudentId').mockResolvedValue([]);

  vi.spyOn(n8n, 'triggerDocumentRouting').mockResolvedValue(undefined);

  vi.spyOn(notifications, 'notifyInApp').mockResolvedValue(undefined);
  vi.spyOn(notifications, 'notifyInAppBulk').mockResolvedValue(undefined);
  vi.spyOn(notifications, 'dispatchStudentAlert').mockResolvedValue(undefined);
});

describe('submitPayment — ownership (the IDOR fix)', () => {
  it("rejects a student submitting against another student's document", async () => {
    documentModel.findById.mockResolvedValue([
      { id: 9, student_id: 'STU-999', request_group_id: 'REQ-OTHER1', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    expect(await statusOf(service.submitPayment(STUDENT, 9, { gcash_reference_no: 'X' }, RECEIPT))).toBe(403);
    expect(documentModel.updatePaymentSubmissionForGroup).not.toHaveBeenCalled();
  });

  it('allows a student submitting against their own document', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    const res = await service.submitPayment(STUDENT, 5, { gcash_reference_no: 'REF-1' }, RECEIPT);
    expect(res.message).toMatch(/submitted successfully/i);
    // Keyed by the request group, so a multi-document request settles at once.
    expect(documentModel.updatePaymentSubmissionForGroup).toHaveBeenCalledWith(
      'REQ-TEST01', 'REF-1', '/uploads/receipt.png', 'gcash'
    );
  });

  it('allows re-submission while awaiting verification', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_FINANCE_VERIFICATION },
    ]);
    await expect(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, RECEIPT)).resolves.toBeTruthy();
  });

  // Before pricing there is no amount to pay; after Finance clears it the money
  // is already accounted for. Either way a receipt belongs to nothing.
  it.each([
    STATUS.PENDING_W1_INTAKE,
    STATUS.PENDING_SEC_EVALUATION,
    STATUS.SEC_PROCESSING,
    STATUS.PAID_PENDING_SEC_RELEASE,
    STATUS.READY_FOR_RELEASE,
    STATUS.COMPLETED,
  ])(
    'refuses to attach a receipt to a document already at %s',
    async (current_status) => {
      documentModel.findById.mockResolvedValue([{ id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status }]);
      expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, RECEIPT))).toBe(400);
    }
  );

  it("requires whatever the chosen payment method asks for", async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    // GCash requires both a reference and a receipt image.
    expect(await statusOf(service.submitPayment(STUDENT, 5, {}, RECEIPT))).toBe(400);
    expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, null))).toBe(400);
    expect(documentModel.updatePaymentSubmissionForGroup).not.toHaveBeenCalled();
  });

  it('records the payment method the student actually used', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    referenceModel.findPaymentMethodByCode.mockResolvedValue([
      { id: 3, code: 'online_banking', name: 'Online Banking / Bank Transfer', provider: 'manual',
        is_active: 1, requires_reference: 1, reference_label: 'Transaction Reference Number', requires_proof: 1 },
    ]);

    await service.submitPayment(
      STUDENT, 5, { gcash_reference_no: 'TXN-9', payment_method: 'online_banking' }, RECEIPT
    );
    expect(documentModel.updatePaymentSubmissionForGroup).toHaveBeenCalledWith(
      'REQ-TEST01', 'TXN-9', '/uploads/receipt.png', 'online_banking'
    );
  });

  it('rejects a payment method that is not available', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    referenceModel.findPaymentMethodByCode.mockResolvedValue([]);
    expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R', payment_method: 'crypto' }, RECEIPT))).toBe(400);
  });

  it('rejects a method the admin has deactivated', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    referenceModel.findPaymentMethodByCode.mockResolvedValue([
      { id: 2, code: 'card', name: 'Card', provider: 'manual', is_active: 0 },
    ]);
    expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R', payment_method: 'card' }, RECEIPT))).toBe(400);
  });

  it('404s for a document that does not exist', async () => {
    documentModel.findById.mockResolvedValue([]);
    expect(await statusOf(service.submitPayment(STUDENT, 404, { gcash_reference_no: 'R' }, RECEIPT))).toBe(404);
  });

  it('notifies the Finance desk once the receipt lands', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    userModel.findFinanceClerks.mockResolvedValue([{ id: 40 }, { id: 41 }]);
    await service.submitPayment(STUDENT, 5, { gcash_reference_no: 'REF-9' }, RECEIPT);
    expect(notifications.notifyInAppBulk).toHaveBeenCalledWith(
      [{ id: 40 }, { id: 41 }],
      expect.objectContaining({ title: 'New Payment Submission' })
    );
  });
});

describe('uploadDocument — a student can only file for themselves', () => {
  beforeEach(() => {
    vi.spyOn(documentModel, 'insert').mockResolvedValue([{ insertId: 77 }]);
    documentModel.findById.mockResolvedValue([{ id: 77, document_type: 'Diploma', student_id: 'STU-001' }]);
    documentModel.findByRequestGroup.mockResolvedValue([
      { id: 77, document_type: 'Diploma', student_id: 'STU-001' },
    ]);
    vi.spyOn(aiEngine, 'extractDocument').mockResolvedValue(null);
  });

  it("overrides a student_id the client tried to spoof", async () => {
    await service.uploadDocument(STUDENT, { student_id: 'STU-999', document_type: 'Diploma' }, null);
    expect(documentModel.insert.mock.calls[0][0].student_id).toBe('STU-001');
  });

  it('fills in the owner when the client omits student_id entirely', async () => {
    await service.uploadDocument(STUDENT, { document_type: 'Diploma' }, null);
    expect(documentModel.insert.mock.calls[0][0].student_id).toBe('STU-001');
  });

  it('lets Window 1 file on behalf of a named student', async () => {
    await service.uploadDocument(
      WINDOW1,
      { student_id: 'STU-555', student_name: 'Walk-in', document_type: 'Diploma' },
      null
    );
    const row = documentModel.insert.mock.calls[0][0];
    expect(row.student_id).toBe('STU-555');
    // A walk-in is the same request typed in at the counter: it enters the
    // intake queue unpaid, exactly as an online submission does. Filing it as
    // already-PAID would let it skip both its evaluation and its bill.
    expect(row.current_status).toBe(STATUS.PENDING_W1_INTAKE);
    expect(row.payment_status).toBe('UNPAID');
  });

  it('prices the request server-side rather than trusting the client', async () => {
    await service.uploadDocument(
      STUDENT,
      { document_type: 'Transcript of Records', semesters: 8, copies: 2, amount: '1.00' },
      null
    );
    expect(documentModel.insert.mock.calls[0][0].amount).toBe(400);
  });
});

describe('multi-document requests', () => {
  const TYPES = [
    { name: 'Transcript of Records', base_fee: '100.00', fee_rule: 'per_semester_block' },
    { name: 'Diploma', base_fee: '50.00', fee_rule: 'flat' },
  ];

  beforeEach(() => {
    let nextId = 100;
    vi.spyOn(documentModel, 'insert').mockImplementation(async () => [{ insertId: nextId++ }]);
    vi.spyOn(aiEngine, 'extractDocument').mockResolvedValue(null);
    referenceModel.findDocumentTypesByNames.mockResolvedValue(TYPES);
    documentModel.findByRequestGroup.mockResolvedValue([
      { id: 100, document_type: 'Transcript of Records' },
      { id: 101, document_type: 'Diploma' },
    ]);
  });

  const twoItems = {
    items: JSON.stringify([
      { document_type: 'Transcript of Records', semesters: 8, copies: 1 },
      { document_type: 'Diploma', copies: 1 },
    ]),
  };

  it('writes one row per requested document', async () => {
    await service.uploadDocument(STUDENT, twoItems, []);
    expect(documentModel.insert).toHaveBeenCalledTimes(2);
    const names = documentModel.insert.mock.calls.map((c) => c[0].document_type);
    expect(names).toEqual(['Transcript of Records', 'Diploma']);
  });

  it('files every row under one shared request group', async () => {
    await service.uploadDocument(STUDENT, twoItems, []);
    const groups = documentModel.insert.mock.calls.map((c) => c[0].request_group_id);
    expect(new Set(groups).size).toBe(1);
    expect(groups[0]).toMatch(/^REQ-/);
  });

  it('prices each document separately and reports the combined total', async () => {
    const res = await service.uploadDocument(STUDENT, twoItems, []);
    const amounts = documentModel.insert.mock.calls.map((c) => c[0].amount);
    expect(amounts).toEqual([200, 50]); // TOR 8 semesters + Diploma
    expect(res.total_amount).toBe(250);
  });

  it('still files every row against the requesting student, never a spoofed id', async () => {
    await service.uploadDocument(
      STUDENT,
      { ...twoItems, student_id: 'STU-999' },
      []
    );
    const owners = documentModel.insert.mock.calls.map((c) => c[0].student_id);
    expect(owners).toEqual(['STU-001', 'STU-001']);
  });

  it('maps a per-item attachment to the right document', async () => {
    const files = [
      { fieldname: 'document_1', path: '/tmp/dip.png', originalname: 'dip.png', mimetype: 'image/png' },
    ];
    await service.uploadDocument(STUDENT, twoItems, files);
    const [torRow, diplomaRow] = documentModel.insert.mock.calls.map((c) => c[0]);
    expect(torRow.file_path).toBeNull();
    expect(diplomaRow.file_path).toBe('/tmp/dip.png');
  });

  it('rejects an empty selection', async () => {
    expect(await statusOf(service.uploadDocument(STUDENT, { items: '[]' }, []))).toBe(400);
    expect(documentModel.insert).not.toHaveBeenCalled();
  });

  it('rejects an item with no document type', async () => {
    const bad = { items: JSON.stringify([{ copies: 1 }]) };
    expect(await statusOf(service.uploadDocument(STUDENT, bad, []))).toBe(400);
  });

  it('rejects a malformed items payload', async () => {
    expect(await statusOf(service.uploadDocument(STUDENT, { items: 'not json' }, []))).toBe(400);
  });

  it('treats a legacy single-document request as a group of one', async () => {
    documentModel.findByRequestGroup.mockResolvedValue([{ id: 100, document_type: 'Diploma' }]);
    const res = await service.uploadDocument(STUDENT, { document_type: 'Diploma', copies: 1 }, null);
    expect(documentModel.insert).toHaveBeenCalledTimes(1);
    expect(res.tracking_number).toMatch(/^TRC-/);
    expect(res.document).toBeDefined();
  });

  it('rolls back the whole group if one insert fails', async () => {
    documentModel.insert
      .mockResolvedValueOnce([{ insertId: 100 }])
      .mockRejectedValueOnce(new Error('db exploded'));
    await expect(service.uploadDocument(STUDENT, twoItems, [])).rejects.toThrow('db exploded');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe('group payment settles every document at once', () => {
  it('a single receipt covers the whole group', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-G1', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    documentModel.updatePaymentSubmissionForGroup.mockResolvedValue([{ affectedRows: 3 }]);
    documentModel.findByRequestGroup.mockResolvedValue([{ id: 5 }, { id: 6 }, { id: 7 }]);

    const res = await service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, RECEIPT);
    expect(res.documents_covered).toBe(3);
    // every document in the group gets its own audit entry
    expect(stepLogModel.insert).toHaveBeenCalledTimes(3);
  });

  it('Finance approving once clears all of them', async () => {
    const groupDocs = [
      { id: 5, request_group_id: 'REQ-G1', student_id: 'STU-001', current_status: STATUS.PENDING_FINANCE_VERIFICATION },
      { id: 6, request_group_id: 'REQ-G1', student_id: 'STU-001', current_status: STATUS.PENDING_FINANCE_VERIFICATION },
    ];
    documentModel.findByIdForUpdate.mockResolvedValue([groupDocs[0]]);
    documentModel.findByRequestGroupForUpdate.mockResolvedValue(groupDocs);
    documentModel.updatePaymentVerificationForGroup.mockResolvedValue([{ affectedRows: 2 }]);

    const res = await service.verifyPayment(FINANCE, 5, { action: 'approve' }, null);
    expect(res.documents_covered).toBe(2);
    expect(documentModel.updatePaymentVerificationForGroup).toHaveBeenCalledWith(
      'REQ-G1', STATUS.PAID_PENDING_SEC_RELEASE, 'PAID', null, connection
    );
  });

  it("a student still cannot pay for another student's group", async () => {
    documentModel.findById.mockResolvedValue([
      { id: 9, student_id: 'STU-999', request_group_id: 'REQ-OTHER', current_status: STATUS.PENDING_STUDENT_PAYMENT },
    ]);
    expect(await statusOf(service.submitPayment(STUDENT, 9, { gcash_reference_no: 'R' }, RECEIPT))).toBe(403);
    expect(documentModel.updatePaymentSubmissionForGroup).not.toHaveBeenCalled();
  });

  it('documents in a group are still evaluated one at a time', async () => {
    // Accepting one document must not touch its siblings. Only *billing* is
    // group-wide, because the student pays for the request once.
    documentModel.findByIdForUpdate.mockResolvedValue([
      { id: 5, request_group_id: 'REQ-G1', student_id: 'STU-001', tracking_number: 'TRC-1',
        current_status: STATUS.PENDING_SEC_EVALUATION },
    ]);
    await service.acceptForProcessing(SECRETARY, 5, {
      student_id: 'STU-001', student_name: 'Ana', document_type: 'Diploma',
      action: 'approve', estimated_ready_date: '2026-09-05',
    });
    expect(documentModel.updateEvaluation).toHaveBeenCalledTimes(1);
    expect(documentModel.updateEvaluation).toHaveBeenCalledWith(
      5, STATUS.SEC_PROCESSING, 'STU-001', 'Ana', 'Diploma', '2026-09-05', connection
    );
  });
});

describe('verifyPayment — Finance desk only', () => {
  const doc = {
    id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', document_type: 'Diploma',
    tracking_number: 'TRC-1', current_status: STATUS.PENDING_FINANCE_VERIFICATION,
  };

  it.each([
    ['a student', STUDENT],
    ['the Secretary', SECRETARY],
    ['Window 1', WINDOW1],
  ])('rejects %s', async (_label, user) => {
    expect(await statusOf(service.verifyPayment(user, 5, { action: 'approve' }, null))).toBe(403);
  });

  it('rejects an unknown action', async () => {
    expect(await statusOf(service.verifyPayment(FINANCE, 5, { action: 'maybe' }, null))).toBe(400);
  });

  it('marks the document PAID and returns it to the Secretary for handoff', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'approve' }, null);
    expect(documentModel.updatePaymentVerificationForGroup).toHaveBeenCalledWith(
      'REQ-TEST01', STATUS.PAID_PENDING_SEC_RELEASE, 'PAID', null, connection
    );
  });

  it('refuses to verify a document that is not awaiting verification', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([{ ...doc, current_status: STATUS.SEC_PROCESSING }]);
    expect(await statusOf(service.verifyPayment(FINANCE, 5, { action: 'approve' }, null))).toBe(400);
    expect(documentModel.updatePaymentVerificationForGroup).not.toHaveBeenCalled();
  });

  it('sends the document back as UNPAID on reject', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'reject', notes: 'blurry' }, null);
    expect(documentModel.updatePaymentVerificationForGroup).toHaveBeenCalledWith(
      'REQ-TEST01', STATUS.PENDING_STUDENT_PAYMENT, 'UNPAID', null, connection
    );
  });

  it('stores the official receipt when the clerk uploads one', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'approve' }, { filename: 'official.png' });
    expect(documentModel.updatePaymentVerificationForGroup).toHaveBeenCalledWith(
      'REQ-TEST01', STATUS.PAID_PENDING_SEC_RELEASE, 'PAID', '/uploads/official.png', connection
    );
  });

  it('rolls back and does not commit when the document is missing', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([]);
    expect(await statusOf(service.verifyPayment(FINANCE, 404, { action: 'approve' }, null))).toBe(404);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe('acceptForProcessing — Secretary desk only', () => {
  const doc = {
    id: 5, student_id: 'STU-001', tracking_number: 'TRC-1',
    current_status: STATUS.PENDING_SEC_EVALUATION,
  };
  const body = {
    student_id: 'STU-001', student_name: 'Ana', document_type: 'Diploma',
    action: 'approve', estimated_ready_date: '2026-09-05',
  };

  it.each([['a student', STUDENT], ['Finance', FINANCE], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.acceptForProcessing(user, 5, body))).toBe(403);
    }
  );

  it('takes the document on and records the promised date', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.acceptForProcessing(SECRETARY, 5, body);
    expect(documentModel.updateEvaluation).toHaveBeenCalledWith(
      5, STATUS.SEC_PROCESSING, 'STU-001', 'Ana', 'Diploma', '2026-09-05', connection
    );
  });

  it('will not accept work without telling the student when to expect it', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    const { estimated_ready_date, ...noDate } = body;
    expect(await statusOf(service.acceptForProcessing(SECRETARY, 5, noDate))).toBe(400);
    expect(documentModel.updateEvaluation).not.toHaveBeenCalled();
  });

  it('sends a rejected document back one desk, to Window 1', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.acceptForProcessing(SECRETARY, 5, { ...body, action: 'reject', notes: 'incomplete' });
    expect(documentModel.updateEvaluation).toHaveBeenCalledWith(
      5, STATUS.PENDING_W1_INTAKE, 'STU-001', 'Ana', 'Diploma', null, connection
    );
  });

  it('will not reject without saying why', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    expect(await statusOf(service.acceptForProcessing(SECRETARY, 5, { ...body, action: 'reject' }))).toBe(400);
  });

  it('reaches the student off-app either way', async () => {
    // Both outcomes are worth an SMS: an acceptance carries a date the student
    // plans around, and a rejection is blocking them until they act on it.
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    userModel.findStudentContactByStudentId.mockResolvedValue([{ id: 3, email: 'a@b.c', phone_number: '+639' }]);

    await service.acceptForProcessing(SECRETARY, 5, body);
    expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alsoSmsAndEmail: true })
    );

    notifications.dispatchStudentAlert.mockClear();
    await service.acceptForProcessing(SECRETARY, 5, { ...body, action: 'reject', notes: 'no' });
    expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alsoSmsAndEmail: true })
    );
  });
});

describe('priceDocument — the Secretary sets the price, nobody else', () => {
  const doc = {
    id: 5, student_id: 'STU-001', tracking_number: 'TRC-1', request_group_id: 'REQ-G1',
    document_type: 'Diploma', student_name: 'Ana', current_status: STATUS.SEC_PROCESSING,
  };
  const body = { amount: 250, page_count: 5, pricing_notes: '5 pages at standard rate' };

  it.each([['a student', STUDENT], ['Finance', FINANCE], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.priceDocument(user, 5, body))).toBe(403);
    }
  );

  it('records the amount with its author and its basis', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    documentModel.findByRequestGroupForUpdate.mockResolvedValue([doc]);
    await service.priceDocument(SECRETARY, 5, body);
    expect(documentModel.updatePricing).toHaveBeenCalledWith(
      5,
      { amount: 250, pageCount: 5, pricingNotes: '5 pages at standard rate', clerkId: SECRETARY.id },
      connection
    );
  });

  it.each([[0, 'zero'], [-5, 'negative'], ['abc', 'non-numeric'], [undefined, 'missing']])(
    'refuses a %s amount (%s)',
    async (amount) => {
      documentModel.findByIdForUpdate.mockResolvedValue([doc]);
      expect(await statusOf(service.priceDocument(SECRETARY, 5, { ...body, amount }))).toBe(400);
      expect(documentModel.updatePricing).not.toHaveBeenCalled();
    }
  );

  it('will not price a document that is not being processed', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([
      { ...doc, current_status: STATUS.PENDING_SEC_EVALUATION },
    ]);
    expect(await statusOf(service.priceDocument(SECRETARY, 5, body))).toBe(400);
    expect(documentModel.updatePricing).not.toHaveBeenCalled();
  });

  describe('the group billing gate', () => {
    it('bills the request once the last document has a price', async () => {
      documentModel.findByIdForUpdate.mockResolvedValue([doc]);
      documentModel.findByRequestGroupForUpdate.mockResolvedValue([doc, { ...doc, id: 6 }]);
      documentModel.countUnpricedInGroup.mockResolvedValue(0);
      documentModel.sumGroupAmount.mockResolvedValue(400);

      const res = await service.priceDocument(SECRETARY, 5, body);
      expect(res.billed).toBe(true);
      expect(res.total_amount).toBe(400);
      expect(documentModel.markGroupPayable).toHaveBeenCalledWith('REQ-G1', connection);
    });

    it('holds the bill while a sibling is still unpriced', async () => {
      // Otherwise a two-document request would send the student to Finance
      // twice — once for each document as it happened to finish.
      documentModel.findByIdForUpdate.mockResolvedValue([doc]);
      documentModel.findByRequestGroupForUpdate.mockResolvedValue([doc, { ...doc, id: 6 }]);
      documentModel.countUnpricedInGroup.mockResolvedValue(1);

      const res = await service.priceDocument(SECRETARY, 5, body);
      expect(res.billed).toBe(false);
      expect(documentModel.markGroupPayable).not.toHaveBeenCalled();
    });

    it('tells the student and Finance the same total, once', async () => {
      documentModel.findByIdForUpdate.mockResolvedValue([doc]);
      documentModel.findByRequestGroupForUpdate.mockResolvedValue([doc]);
      documentModel.countUnpricedInGroup.mockResolvedValue(0);
      documentModel.sumGroupAmount.mockResolvedValue(250);
      userModel.findStudentContactByStudentId.mockResolvedValue([{ id: 3, email: 'a@b.c' }]);
      userModel.findFinanceClerks.mockResolvedValue([{ id: 4 }]);

      await service.priceDocument(SECRETARY, 5, body);
      expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('250.00') })
      );
      expect(notifications.notifyInAppBulk).toHaveBeenCalledWith(
        [{ id: 4 }],
        expect.objectContaining({ message: expect.stringContaining('250.00') })
      );
    });
  });

  it('never marks the document PAID — that is Finance\'s alone', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    documentModel.findByRequestGroupForUpdate.mockResolvedValue([doc]);
    await service.priceDocument(SECRETARY, 5, body);
    expect(documentModel.updatePaymentVerificationForGroup).not.toHaveBeenCalled();
  });
});

describe('confirmHandoff — Secretary passes the paper to Window 1', () => {
  const paid = {
    id: 5, student_id: 'STU-001', tracking_number: 'TRC-1', document_type: 'Diploma',
    current_status: STATUS.PAID_PENDING_SEC_RELEASE, payment_status: 'PAID',
  };

  it.each([['a student', STUDENT], ['Finance', FINANCE], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.confirmHandoff(user, 5, {}))).toBe(403);
    }
  );

  it('moves a paid document to the release desk', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([paid]);
    await service.confirmHandoff(SECRETARY, 5, {});
    expect(documentModel.updateStatus).toHaveBeenCalledWith(5, STATUS.READY_FOR_RELEASE, connection);
  });

  it('refuses to hand over a document that has not been paid for', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([{ ...paid, payment_status: 'UNPAID' }]);
    expect(await statusOf(service.confirmHandoff(SECRETARY, 5, {}))).toBe(400);
    expect(documentModel.updateStatus).not.toHaveBeenCalled();
  });

  it('refuses to skip the Finance desk entirely', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([
      { ...paid, current_status: STATUS.SEC_PROCESSING, payment_status: 'UNPAID' },
    ]);
    expect(await statusOf(service.confirmHandoff(SECRETARY, 5, {}))).toBe(400);
  });
});

describe('scanReceipt — OCR assist for the walk-in form', () => {
  const RECEIPT_IMAGE = { path: '/tmp/or.png', originalname: 'or.png', mimetype: 'image/png' };

  it.each([['a student', STUDENT], ['the Secretary', SECRETARY], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.scanReceipt(user, RECEIPT_IMAGE))).toBe(403);
    }
  );

  it('requires an image', async () => {
    expect(await statusOf(service.scanReceipt(FINANCE, null))).toBe(400);
  });

  it('returns what the engine read', async () => {
    vi.spyOn(aiEngine, 'extractReceipt').mockResolvedValue({
      success: true,
      extracted_data: { or_number: 'OR-12345', amount: 300, or_date: '2026-09-06', confidence: 100 },
    });
    const res = await service.scanReceipt(FINANCE, RECEIPT_IMAGE);
    expect(res.success).toBe(true);
    expect(res.extracted_data.or_number).toBe('OR-12345');
    // The clerk is told to check, never that the read is authoritative.
    expect(res.message).toMatch(/check every field/i);
  });

  it('degrades to manual entry when the engine is down', async () => {
    // A student is standing at the counter; the form has to stay usable.
    vi.spyOn(aiEngine, 'extractReceipt').mockResolvedValue(null);
    const res = await service.scanReceipt(FINANCE, RECEIPT_IMAGE);
    expect(res.success).toBe(false);
    expect(res.extracted_data).toEqual({ or_number: null, amount: null, or_date: null, confidence: 0 });
    expect(res.message).toMatch(/by hand/i);
  });

  it('degrades the same way when the engine reads nothing usable', async () => {
    vi.spyOn(aiEngine, 'extractReceipt').mockResolvedValue({ success: false, extracted_data: {} });
    const res = await service.scanReceipt(FINANCE, RECEIPT_IMAGE);
    expect(res.success).toBe(false);
  });

  it('records nothing — reading a receipt is not logging a payment', async () => {
    vi.spyOn(aiEngine, 'extractReceipt').mockResolvedValue({
      success: true, extracted_data: { or_number: 'OR-1', amount: 1, or_date: null, confidence: 33 },
    });
    await service.scanReceipt(FINANCE, RECEIPT_IMAGE);
    expect(documentModel.updateWalkInPaymentForGroup).not.toHaveBeenCalled();
    expect(stepLogModel.insert).not.toHaveBeenCalled();
  });
});

describe('logWalkInPayment — Finance records a counter payment', () => {
  const billed = {
    id: 5, student_id: 'STU-001', request_group_id: 'REQ-G1', document_type: 'Diploma',
    tracking_number: 'TRC-1', current_status: STATUS.PENDING_STUDENT_PAYMENT,
  };
  const body = { or_number: 'OR-12345', or_date: '2026-09-06' };

  it.each([['a student', STUDENT], ['the Secretary', SECRETARY], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.logWalkInPayment(user, 5, body, null))).toBe(403);
    }
  );

  it('records the receipt against the whole request', async () => {
    documentModel.findById.mockResolvedValue([billed]);
    documentModel.findByRequestGroup.mockResolvedValue([billed, { ...billed, id: 6 }]);
    documentModel.updateWalkInPaymentForGroup.mockResolvedValue([{ affectedRows: 2 }]);

    const res = await service.logWalkInPayment(FINANCE, 5, body, null);
    expect(res.documents_covered).toBe(2);
    expect(documentModel.updateWalkInPaymentForGroup).toHaveBeenCalledWith(
      'REQ-G1',
      { orNumber: 'OR-12345', orDate: '2026-09-06', clerkId: FINANCE.id, receiptPath: null }
    );
  });

  it('requires the Official Receipt number', async () => {
    // A counter payment leaves no other trace in the system.
    documentModel.findById.mockResolvedValue([billed]);
    expect(await statusOf(service.logWalkInPayment(FINANCE, 5, { or_date: '2026-09-06' }, null))).toBe(400);
    expect(documentModel.updateWalkInPaymentForGroup).not.toHaveBeenCalled();
  });

  it('stores the scanned receipt image when one is provided', async () => {
    documentModel.findById.mockResolvedValue([billed]);
    documentModel.findByRequestGroup.mockResolvedValue([billed]);
    await service.logWalkInPayment(FINANCE, 5, body, { filename: 'or.png' });
    expect(documentModel.updateWalkInPaymentForGroup).toHaveBeenCalledWith(
      'REQ-G1', expect.objectContaining({ receiptPath: '/uploads/or.png' })
    );
  });

  it('will not log a payment against a request that has not been billed', async () => {
    documentModel.findById.mockResolvedValue([{ ...billed, current_status: STATUS.SEC_PROCESSING }]);
    expect(await statusOf(service.logWalkInPayment(FINANCE, 5, body, null))).toBe(400);
  });

  it('leaves verification to a separate act', async () => {
    // A walk-in is held to the same standard as a digital payment: logging it
    // records the claim, it does not clear it.
    documentModel.findById.mockResolvedValue([billed]);
    documentModel.findByRequestGroup.mockResolvedValue([billed]);
    await service.logWalkInPayment(FINANCE, 5, body, null);
    expect(documentModel.updatePaymentVerificationForGroup).not.toHaveBeenCalled();
  });
});

describe('intakeDocument — Window 1 checks the paperwork', () => {
  const filed = {
    id: 5, student_id: 'STU-001', tracking_number: 'TRC-1', document_type: 'Diploma',
    current_status: STATUS.PENDING_W1_INTAKE,
  };

  it.each([['a student', STUDENT], ['Finance', FINANCE], ['the Secretary', SECRETARY]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.intakeDocument(user, 5, { action: 'approve' }, null))).toBe(403);
    }
  );

  it('routes an approved intake to the College Secretary', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([filed]);
    await service.intakeDocument(WINDOW1, 5, { action: 'approve' }, null);
    expect(documentModel.updateStatus).toHaveBeenCalledWith(5, STATUS.PENDING_SEC_EVALUATION, connection);
  });

  it('only asks n8n for a desk once a human has cleared the paperwork', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([filed]);
    userModel.findStudentCourseByStudentId.mockResolvedValue([{ course: 'BS Computer Science' }]);
    referenceModel.findCollegeByName = vi.fn().mockResolvedValue([{ short_code: 'CCS' }]);

    await service.intakeDocument(WINDOW1, 5, { action: 'approve' }, null);
    expect(n8n.triggerDocumentRouting).toHaveBeenCalledWith(
      expect.objectContaining({ document_id: 5, college_code: 'CCS' })
    );
  });

  it('leaves a returned request in the intake queue, since there is nowhere earlier', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([filed]);
    await service.intakeDocument(WINDOW1, 5, { action: 'return', notes: 'Bring your clearance.' }, null);
    expect(documentModel.updateStatus).not.toHaveBeenCalled();
    expect(n8n.triggerDocumentRouting).not.toHaveBeenCalled();
  });

  it('will not return a request without telling the student what to fix', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([filed]);
    expect(await statusOf(service.intakeDocument(WINDOW1, 5, { action: 'return' }, null))).toBe(400);
  });

  it('attaches paperwork the clerk scanned at the counter', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([filed]);
    vi.spyOn(aiEngine, 'extractDocument').mockResolvedValue(null);
    await service.intakeDocument(
      WINDOW1, 5, { action: 'approve' },
      { path: '/uploads/scan.png', originalname: 'scan.png', filename: 'scan.png' }
    );
    expect(documentModel.updateAttachment).toHaveBeenCalledWith(
      5, '/uploads/scan.png', 'scan.png', connection
    );
  });

  it('rejects an unknown action', async () => {
    expect(await statusOf(service.intakeDocument(WINDOW1, 5, { action: 'maybe' }, null))).toBe(400);
  });
});

describe('releaseDocument — Window 1 only', () => {
  it.each([['a student', STUDENT], ['Finance', FINANCE], ['the Secretary', SECRETARY]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.releaseDocument(user, 5))).toBe(403);
    }
  );

  it('completes the document and alerts the student', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([
      { id: 5, student_id: 'STU-001', document_type: 'Diploma', tracking_number: 'TRC-1',
        current_status: STATUS.READY_FOR_RELEASE },
    ]);
    userModel.findStudentContactByStudentId.mockResolvedValue([{ id: 3, email: 'a@b.c' }]);
    await service.releaseDocument(WINDOW1, 5);
    expect(documentModel.markCompleted).toHaveBeenCalledWith(5, connection);
    expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alsoSmsAndEmail: true })
    );
  });
});

describe('cancelDocument — owner only, unpaid only', () => {
  it('rejects non-students', async () => {
    expect(await statusOf(service.cancelDocument(FINANCE, 5))).toBe(403);
  });

  it("rejects cancelling another student's request", async () => {
    connection = fakeConnection();
    pool.getConnection.mockResolvedValue(connection);
    documentModel.findByIdForUpdate.mockResolvedValue([
      { id: 9, student_id: 'STU-999', request_group_id: 'REQ-OTHER1', current_status: STATUS.PENDING_W1_INTAKE },
    ]);
    expect(await statusOf(service.cancelDocument(STUDENT, 9))).toBe(400);
    expect(documentModel.deleteById).not.toHaveBeenCalled();
  });

  // The window closes when the Secretary starts work: past that point paper and
  // toner have been spent on a document that cannot be un-printed.
  it.each([
    STATUS.SEC_PROCESSING,
    STATUS.PENDING_STUDENT_PAYMENT,
    STATUS.PENDING_FINANCE_VERIFICATION,
    STATUS.PAID_PENDING_SEC_RELEASE,
    STATUS.COMPLETED,
  ])(
    'refuses to cancel a request already at %s',
    async (current_status) => {
      documentModel.findByIdForUpdate.mockResolvedValue([{ id: 5, student_id: 'STU-001', current_status }]);
      expect(await statusOf(service.cancelDocument(STUDENT, 5))).toBe(400);
      expect(documentModel.deleteById).not.toHaveBeenCalled();
    }
  );

  it.each([STATUS.PENDING_W1_INTAKE, STATUS.PENDING_SEC_EVALUATION])(
    'deletes an owner\'s request at %s, audit trail first',
    async (current_status) => {
    documentModel.findByIdForUpdate.mockResolvedValue([
      { id: 5, student_id: 'STU-001', request_group_id: 'REQ-TEST01', current_status },
    ]);
    await service.cancelDocument(STUDENT, 5);
    expect(stepLogModel.deleteByDocumentId).toHaveBeenCalledWith(5, connection);
    expect(documentModel.deleteById).toHaveBeenCalledWith(5, connection);
  });
});

describe('listDocuments — role scoping', () => {
  const conditionsFrom = () => documentModel.listWithFilters.mock.calls[0][0].join(' AND ');

  it('limits a student to their own student_id', async () => {
    await service.listDocuments(STUDENT, {});
    expect(conditionsFrom()).toContain('student_id = ?');
    expect(documentModel.listWithFilters.mock.calls[0][1]).toContain('STU-001');
  });

  it('blocks a student with no student_id on record from seeing anything', async () => {
    userModel.findStudentIdById.mockResolvedValue([]);
    await service.listDocuments(STUDENT, {});
    expect(conditionsFrom()).toContain('1 = 0');
  });

  it('gives Finance both money queues: awaiting payment and awaiting verification', async () => {
    await service.listDocuments(FINANCE, {});
    // Statuses are bound rather than inlined, so the assertion is on the params.
    const params = documentModel.listWithFilters.mock.calls[0][1];
    expect(params).toContain(STATUS.PENDING_STUDENT_PAYMENT);
    expect(params).toContain(STATUS.PENDING_FINANCE_VERIFICATION);
  });

  it("scopes a Secretary to their own college's students", async () => {
    userModel.findCourseById.mockResolvedValue([{ course: 'College of Computer Studies' }]);
    await service.listDocuments(SECRETARY, {});
    expect(conditionsFrom()).toContain('SELECT student_id FROM users WHERE course = ?');
    expect(documentModel.listWithFilters.mock.calls[0][1]).toContain('College of Computer Studies');
  });

  it('shows a Secretary a document n8n assigned to them', async () => {
    userModel.findCourseById.mockResolvedValue([{ course: 'College of Computer Studies' }]);
    await service.listDocuments(SECRETARY, {});
    expect(conditionsFrom()).toContain('assigned_clerk_id = ?');
    expect(documentModel.listWithFilters.mock.calls[0][1]).toContain(SECRETARY.id);
  });

  it('still shows a Secretary unassigned documents from their college', async () => {
    // The ~10,000 records that predate n8n routing all have a NULL
    // assigned_clerk_id. If routing became the only filter they would vanish
    // from every queue in the system.
    userModel.findCourseById.mockResolvedValue([{ course: 'College of Computer Studies' }]);
    await service.listDocuments(SECRETARY, {});
    expect(conditionsFrom()).toContain('assigned_clerk_id IS NULL');
  });

  it('hides from a Secretary only documents routed to a *different* Secretary', async () => {
    // An assignment to Window 1 or the Registrar must not remove a document
    // from the secretary queue it still has to pass through.
    userModel.findCourseById.mockResolvedValue([{ course: 'College of Computer Studies' }]);
    await service.listDocuments(SECRETARY, {});
    expect(conditionsFrom()).toContain(
      "assigned_clerk_id NOT IN\n                      (SELECT id FROM users WHERE desk_assignment = 'Secretary')"
    );
  });

  it('falls back to every college for a Secretary with no college on record', async () => {
    userModel.findCourseById.mockResolvedValue([{ course: null }]);
    await service.listDocuments(SECRETARY, {});
    const conditions = conditionsFrom();
    expect(conditions).toContain('1 = 1');
    expect(conditions).not.toContain('SELECT student_id FROM users WHERE course = ?');
    // The bound params are the five queue statuses and the clerk id, and
    // nothing else: no course value is appended when there is no college.
    expect(documentModel.listWithFilters.mock.calls[0][1]).toEqual([
      STATUS.PENDING_SEC_EVALUATION,
      STATUS.SEC_PROCESSING,
      STATUS.PAID_PENDING_SEC_RELEASE,
      STATUS.READY_FOR_RELEASE,
      STATUS.COMPLETED,
      SECRETARY.id,
    ]);
  });

  it('gives Window 1 the whole queue', async () => {
    await service.listDocuments(WINDOW1, {});
    expect(documentModel.listWithFilters.mock.calls[0][0]).toEqual([]);
  });

  it('gives an admin the whole queue unless a status filter is supplied', async () => {
    await service.listDocuments(ADMIN, {});
    expect(documentModel.listWithFilters.mock.calls[0][0]).toEqual([]);

    documentModel.listWithFilters.mockClear();
    await service.listDocuments(ADMIN, { status: 'completed' });
    expect(documentModel.listWithFilters.mock.calls[0][0]).toContain('current_status = ?');
  });

  it('computes pagination from the total', async () => {
    documentModel.countWithFilters.mockResolvedValue(25);
    const res = await service.listDocuments(ADMIN, { page: '2', limit: '10' });
    expect(res).toMatchObject({ total: 25, page: 2, limit: 10, totalPages: 3 });
  });
});

describe('AI-engine fallbacks', () => {
  it('falls back to a locally generated 7-day forecast when the engine is down', async () => {
    vi.spyOn(aiEngine, 'getForecast').mockResolvedValue(null);
    const res = await service.getForecast();
    expect(res.source).toBe('fallback');
    expect(res.forecast).toHaveLength(7);
  });

  it('passes the engine forecast straight through when it is up', async () => {
    vi.spyOn(aiEngine, 'getForecast').mockResolvedValue({ forecast: [], source: 'prophet' });
    expect((await service.getForecast()).source).toBe('prophet');
  });

  it('reports optimal performance when queues are short', async () => {
    vi.spyOn(aiEngine, 'getInsights').mockResolvedValue(null);
    const res = await service.getInsights();
    expect(res.source).toBe('fallback');
    expect(res.insights.some((i) => i.title === 'System Normal')).toBe(true);
  });

  it('raises a bottleneck warning when the Secretary queue is long', async () => {
    vi.spyOn(aiEngine, 'getInsights').mockResolvedValue(null);
    documentModel.countByStatus.mockImplementation(async (status) =>
      status === STATUS.PENDING_SEC_EVALUATION ? 8 : 0
    );
    const res = await service.getInsights();
    expect(res.insights.some((i) => /Secretary Queue Alert/i.test(i.title))).toBe(true);
  });
});

describe('getActivityLogs — admin only', () => {
  it.each([['a student', STUDENT], ['Finance', FINANCE]])('rejects %s', async (_label, user) => {
    expect(await statusOf(service.getActivityLogs(user))).toBe(403);
  });
});
