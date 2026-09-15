/**
 * The graduate form is admin-configurable, so validation is *derived* from the
 * field definitions rather than hardcoded. These tests pin that behaviour:
 * changing the definitions must change what is accepted, with no code change.
 */
const gradModel = require('../../models/gradApplication.model');
const userModel = require('../../models/user.model');
const { pool } = require('../../config/db');
const service = require('../gradApplication.service');

const STUDENT = { id: 3, role: 'student', full_name: 'Ana Reyes' };
const ADMIN = { id: 7, role: 'admin' };
const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };

const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);
const messageOf = (promise) => promise.then(() => '', (err) => err.message);

const FIELDS = [
  { field_key: 'year_graduated', label: 'Year Graduated', field_type: 'number', is_required: 1, options: null },
  { field_key: 'program', label: 'Degree Program', field_type: 'text', is_required: 1, options: null },
  { field_key: 'contact_email', label: 'Contact Email', field_type: 'email', is_required: 0, options: null },
  { field_key: 'grad_date', label: 'Graduation Date', field_type: 'date', is_required: 0, options: null },
];

let connection;

beforeEach(() => {
  connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn().mockResolvedValue([[], []]),
  };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);

  vi.spyOn(gradModel, 'listFields').mockResolvedValue(FIELDS);
  vi.spyOn(gradModel, 'insertApplication').mockResolvedValue([{ insertId: 42 }]);
  vi.spyOn(gradModel, 'insertValue').mockResolvedValue([{}]);
  vi.spyOn(gradModel, 'findApplicationById').mockResolvedValue([]);
  vi.spyOn(gradModel, 'findApplicationsByStudent').mockResolvedValue([]);
  vi.spyOn(gradModel, 'findValues').mockResolvedValue([]);
  vi.spyOn(gradModel, 'listApplications').mockResolvedValue([]);
  vi.spyOn(gradModel, 'updateApplicationStatus').mockResolvedValue([{ affectedRows: 1 }]);

  vi.spyOn(userModel, 'findStudentIdById').mockResolvedValue([{ student_id: 'STU-001' }]);
});

describe('validateAnswers — driven entirely by the field definitions', () => {
  it('accepts a complete, well-formed submission', () => {
    expect(
      service.validateAnswers(FIELDS, {
        year_graduated: '2024',
        program: 'BS Information Technology',
        contact_email: 'ana@example.com',
      })
    ).toEqual([]);
  });

  it('reports every missing required field at once, not one at a time', () => {
    const errors = service.validateAnswers(FIELDS, {});
    expect(errors).toHaveLength(2);
    expect(errors.join(' ')).toMatch(/Year Graduated is required/);
    expect(errors.join(' ')).toMatch(/Degree Program is required/);
  });

  it('treats blank and whitespace-only values as missing', () => {
    expect(service.validateAnswers(FIELDS, { year_graduated: '2024', program: '   ' }))
      .toContain('Degree Program is required.');
  });

  it('allows optional fields to be absent', () => {
    expect(service.validateAnswers(FIELDS, { year_graduated: '2024', program: 'BSIT' })).toEqual([]);
  });

  it.each([
    ['number', { year_graduated: 'not-a-year', program: 'BSIT' }, /Year Graduated must be a number/],
    ['email', { year_graduated: '2024', program: 'BSIT', contact_email: 'nope' }, /valid email/],
    ['date', { year_graduated: '2024', program: 'BSIT', grad_date: 'someday' }, /valid date/],
  ])('enforces the %s field type', (_label, answers, pattern) => {
    expect(service.validateAnswers(FIELDS, answers).join(' ')).toMatch(pattern);
  });

  it('rejects a key that no field defines, rather than storing junk', () => {
    const errors = service.validateAnswers(FIELDS, {
      year_graduated: '2024', program: 'BSIT', sneaky: 'value',
    });
    expect(errors.join(' ')).toMatch(/Unknown field: sneaky/);
  });

  it('restricts a select to its configured options', () => {
    const withSelect = [
      { field_key: 'honors', label: 'Honors', field_type: 'select', is_required: 0,
        options: JSON.stringify(['Cum Laude', 'Magna Cum Laude']) },
    ];
    expect(service.validateAnswers(withSelect, { honors: 'Cum Laude' })).toEqual([]);
    expect(service.validateAnswers(withSelect, { honors: 'Invented' }).join(' '))
      .toMatch(/must be one of/);
  });

  it('adapts when the admin changes a field from optional to required', () => {
    const before = service.validateAnswers(FIELDS, { year_graduated: '2024', program: 'BSIT' });
    expect(before).toEqual([]);

    const nowRequired = FIELDS.map((f) =>
      f.field_key === 'contact_email' ? { ...f, is_required: 1 } : f
    );
    expect(service.validateAnswers(nowRequired, { year_graduated: '2024', program: 'BSIT' }).join(' '))
      .toMatch(/Contact Email is required/);
  });
});

describe('submitApplication', () => {
  const valid = { answers: { year_graduated: '2024', program: 'BSIT' } };

  it('files the application against the session student, not a client-supplied id', async () => {
    await service.submitApplication(STUDENT, { ...valid, student_id: 'STU-999' });
    expect(gradModel.insertApplication).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'STU-001' }),
      connection
    );
  });

  it('stores one row per supplied answer and skips empty ones', async () => {
    await service.submitApplication(STUDENT, valid);
    const keys = gradModel.insertValue.mock.calls.map((c) => c[0].field_key);
    expect(keys).toEqual(['year_graduated', 'program']);
  });

  it('rejects an invalid submission before writing anything', async () => {
    expect(await statusOf(service.submitApplication(STUDENT, { answers: {} }))).toBe(400);
    expect(gradModel.insertApplication).not.toHaveBeenCalled();
  });

  it('surfaces the specific validation problems in the message', async () => {
    const msg = await messageOf(service.submitApplication(STUDENT, { answers: { program: 'BSIT' } }));
    expect(msg).toMatch(/Year Graduated is required/);
  });

  it('rejects a non-object answers payload', async () => {
    expect(await statusOf(service.submitApplication(STUDENT, { answers: ['nope'] }))).toBe(400);
  });

  it('explains itself when the form has not been configured yet', async () => {
    gradModel.listFields.mockResolvedValue([]);
    const msg = await messageOf(service.submitApplication(STUDENT, valid));
    expect(msg).toMatch(/not been configured/i);
  });

  it('rejects a user with no student record', async () => {
    userModel.findStudentIdById.mockResolvedValue([]);
    expect(await statusOf(service.submitApplication(STUDENT, valid))).toBe(403);
  });

  it('rolls back if writing an answer fails', async () => {
    gradModel.insertValue.mockRejectedValueOnce(new Error('db exploded'));
    await expect(service.submitApplication(STUDENT, valid)).rejects.toThrow('db exploded');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe('reading applications', () => {
  const APP = { id: 42, student_id: 'STU-001', status: 'submitted' };

  it("lets a student read their own", async () => {
    gradModel.findApplicationById.mockResolvedValue([APP]);
    const res = await service.getApplication(STUDENT, 42);
    expect(res.application.id).toBe(42);
  });

  it("denies a student someone else's", async () => {
    gradModel.findApplicationById.mockResolvedValue([{ ...APP, student_id: 'STU-999' }]);
    expect(await statusOf(service.getApplication(STUDENT, 42))).toBe(403);
  });

  it('lets staff read any application', async () => {
    gradModel.findApplicationById.mockResolvedValue([{ ...APP, student_id: 'STU-999' }]);
    await expect(service.getApplication(ADMIN, 42)).resolves.toBeTruthy();
  });

  it('404s for an application that does not exist', async () => {
    expect(await statusOf(service.getApplication(ADMIN, 999))).toBe(404);
  });

  it('merges stored answers onto the current field definitions', async () => {
    gradModel.findApplicationById.mockResolvedValue([APP]);
    gradModel.findValues.mockResolvedValue([{ field_key: 'program', value: 'BSIT' }]);
    const { answers } = await service.getApplication(ADMIN, 42);
    const program = answers.find((a) => a.field_key === 'program');
    expect(program).toMatchObject({ label: 'Degree Program', value: 'BSIT' });
    // fields with no answer still appear, so the form renders completely
    expect(answers.find((a) => a.field_key === 'year_graduated').value).toBeNull();
  });

  it('still shows answers whose field was later removed by the admin', async () => {
    gradModel.findApplicationById.mockResolvedValue([APP]);
    gradModel.findValues.mockResolvedValue([{ field_key: 'retired_question', value: 'kept' }]);
    const { answers } = await service.getApplication(ADMIN, 42);
    expect(answers.find((a) => a.field_key === 'retired_question').value).toBe('kept');
  });
});

describe('staff review', () => {
  it('blocks students from the review queue', async () => {
    expect(await statusOf(service.listApplications(STUDENT))).toBe(403);
  });

  it.each([['an admin', ADMIN], ['a clerk', CLERK]])('allows %s', async (_label, user) => {
    await expect(service.listApplications(user)).resolves.toHaveProperty('applications');
  });

  it('blocks a student from deciding an application', async () => {
    expect(await statusOf(service.reviewApplication(STUDENT, 42, { status: 'approved' }))).toBe(403);
  });

  it.each(['under_review', 'approved', 'rejected'])('accepts the %s decision', async (status) => {
    await expect(service.reviewApplication(ADMIN, 42, { status })).resolves.toBeTruthy();
    expect(gradModel.updateApplicationStatus).toHaveBeenCalledWith(42, status, ADMIN.id, null);
  });

  it('rejects an unknown status', async () => {
    expect(await statusOf(service.reviewApplication(ADMIN, 42, { status: 'maybe' }))).toBe(400);
  });

  it('404s when the application does not exist', async () => {
    gradModel.updateApplicationStatus.mockResolvedValue([{ affectedRows: 0 }]);
    expect(await statusOf(service.reviewApplication(ADMIN, 999, { status: 'approved' }))).toBe(404);
  });
});
