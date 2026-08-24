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
  vi.spyOn(documentModel, 'updatePaymentSubmission').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(documentModel, 'updatePaymentVerification').mockResolvedValue([{ affectedRows: 1 }]);
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

  vi.spyOn(notifications, 'notifyInApp').mockResolvedValue(undefined);
  vi.spyOn(notifications, 'notifyInAppBulk').mockResolvedValue(undefined);
  vi.spyOn(notifications, 'dispatchStudentAlert').mockResolvedValue(undefined);
});

describe('submitPayment — ownership (the IDOR fix)', () => {
  it("rejects a student submitting against another student's document", async () => {
    documentModel.findById.mockResolvedValue([
      { id: 9, student_id: 'STU-999', current_status: 'pending_payment' },
    ]);
    expect(await statusOf(service.submitPayment(STUDENT, 9, { gcash_reference_no: 'X' }, RECEIPT))).toBe(403);
    expect(documentModel.updatePaymentSubmission).not.toHaveBeenCalled();
  });

  it('allows a student submitting against their own document', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', current_status: 'pending_payment' },
    ]);
    const res = await service.submitPayment(STUDENT, 5, { gcash_reference_no: 'REF-1' }, RECEIPT);
    expect(res.message).toMatch(/submitted successfully/i);
    expect(documentModel.updatePaymentSubmission).toHaveBeenCalledWith(5, 'REF-1', '/uploads/receipt.png');
  });

  it('allows re-submission while awaiting verification', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', current_status: 'pending_payment_verification' },
    ]);
    await expect(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, RECEIPT)).resolves.toBeTruthy();
  });

  it.each(['pending_secretary', 'ready_window_1', 'completed'])(
    'refuses to attach a receipt to a document already at %s',
    async (current_status) => {
      documentModel.findById.mockResolvedValue([{ id: 5, student_id: 'STU-001', current_status }]);
      expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, RECEIPT))).toBe(400);
    }
  );

  it('requires a reference number and a receipt file', async () => {
    expect(await statusOf(service.submitPayment(STUDENT, 5, {}, RECEIPT))).toBe(400);
    expect(await statusOf(service.submitPayment(STUDENT, 5, { gcash_reference_no: 'R' }, null))).toBe(400);
  });

  it('404s for a document that does not exist', async () => {
    documentModel.findById.mockResolvedValue([]);
    expect(await statusOf(service.submitPayment(STUDENT, 404, { gcash_reference_no: 'R' }, RECEIPT))).toBe(404);
  });

  it('notifies the Finance desk once the receipt lands', async () => {
    documentModel.findById.mockResolvedValue([
      { id: 5, student_id: 'STU-001', current_status: 'pending_payment' },
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
    // legacy intake is already paid and skips straight to the Secretary
    expect(row.current_status).toBe('pending_secretary');
    expect(row.payment_status).toBe('PAID');
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

describe('verifyPayment — Finance desk only', () => {
  const doc = { id: 5, student_id: 'STU-001', document_type: 'Diploma' };

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

  it('marks the document PAID and routes it to the Secretary on approve', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'approve' }, null);
    expect(documentModel.updatePaymentVerification).toHaveBeenCalledWith(
      5, 'pending_secretary', 'PAID', null, connection
    );
  });

  it('sends the document back as UNPAID on reject', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'reject', notes: 'blurry' }, null);
    expect(documentModel.updatePaymentVerification).toHaveBeenCalledWith(
      5, 'pending_payment', 'UNPAID', null, connection
    );
  });

  it('stores the official receipt when the clerk uploads one', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.verifyPayment(FINANCE, 5, { action: 'approve' }, { filename: 'official.png' });
    expect(documentModel.updatePaymentVerification).toHaveBeenCalledWith(
      5, 'pending_secretary', 'PAID', '/uploads/official.png', connection
    );
  });

  it('rolls back and does not commit when the document is missing', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([]);
    expect(await statusOf(service.verifyPayment(FINANCE, 404, { action: 'approve' }, null))).toBe(404);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe('evaluateDocument — Secretary desk only', () => {
  const doc = { id: 5, student_id: 'STU-001', tracking_number: 'TRC-1' };
  const body = { student_id: 'STU-001', student_name: 'Ana', document_type: 'Diploma', action: 'approve' };

  it.each([['a student', STUDENT], ['Finance', FINANCE], ['Window 1', WINDOW1]])(
    'rejects %s',
    async (_label, user) => {
      expect(await statusOf(service.evaluateDocument(user, 5, body))).toBe(403);
    }
  );

  it('routes an approved document to Window 1', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.evaluateDocument(SECRETARY, 5, body);
    expect(documentModel.updateEvaluation).toHaveBeenCalledWith(
      5, 'ready_window_1', 'STU-001', 'Ana', 'Diploma', connection
    );
  });

  it('marks a rejected document as rejected', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    await service.evaluateDocument(SECRETARY, 5, { ...body, action: 'reject', notes: 'incomplete' });
    expect(documentModel.updateEvaluation).toHaveBeenCalledWith(
      5, 'rejected', 'STU-001', 'Ana', 'Diploma', connection
    );
  });

  it('sends SMS and email only when approved', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([doc]);
    userModel.findStudentContactByStudentId.mockResolvedValue([{ id: 3, email: 'a@b.c', phone_number: '+639' }]);

    await service.evaluateDocument(SECRETARY, 5, body);
    expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alsoSmsAndEmail: true })
    );

    notifications.dispatchStudentAlert.mockClear();
    await service.evaluateDocument(SECRETARY, 5, { ...body, action: 'reject', notes: 'no' });
    expect(notifications.dispatchStudentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alsoSmsAndEmail: false })
    );
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
      { id: 5, student_id: 'STU-001', document_type: 'Diploma', tracking_number: 'TRC-1' },
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
      { id: 9, student_id: 'STU-999', current_status: 'pending_payment' },
    ]);
    expect(await statusOf(service.cancelDocument(STUDENT, 9))).toBe(400);
    expect(documentModel.deleteById).not.toHaveBeenCalled();
  });

  it.each(['pending_payment_verification', 'pending_secretary', 'completed'])(
    'refuses to cancel a request already at %s',
    async (current_status) => {
      documentModel.findByIdForUpdate.mockResolvedValue([{ id: 5, student_id: 'STU-001', current_status }]);
      expect(await statusOf(service.cancelDocument(STUDENT, 5))).toBe(400);
      expect(documentModel.deleteById).not.toHaveBeenCalled();
    }
  );

  it('deletes an unpaid request of its owner, audit trail first', async () => {
    documentModel.findByIdForUpdate.mockResolvedValue([
      { id: 5, student_id: 'STU-001', current_status: 'pending_payment' },
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

  it('defaults Finance to the payment-verification queue', async () => {
    await service.listDocuments(FINANCE, {});
    expect(conditionsFrom()).toContain('pending_payment_verification');
  });

  it("scopes a Secretary to their own college's students", async () => {
    userModel.findCourseById.mockResolvedValue([{ course: 'College of Computer Studies' }]);
    await service.listDocuments(SECRETARY, {});
    expect(conditionsFrom()).toContain('SELECT student_id FROM users WHERE course = ?');
    expect(documentModel.listWithFilters.mock.calls[0][1]).toContain('College of Computer Studies');
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
      status === 'pending_secretary' ? 8 : 0
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
