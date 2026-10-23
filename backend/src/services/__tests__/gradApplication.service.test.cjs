/**
 * The graduate form is admin-configurable, so validation is *derived* from the
 * field definitions rather than hardcoded. These tests pin that behaviour:
 * changing the definitions must change what is accepted, with no code change.
 */
const gradModel = require('../../models/gradApplication.model');
const userModel = require('../../models/user.model');
const { pool } = require('../../config/db');
const service = require('../gradApplication.service');
const referenceModel = require('../../models/referenceData.model');
const programs = require('../../models/program.model');

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
  vi.spyOn(userModel, 'updateProfile').mockResolvedValue([{}]);
  const college = { id: 1, name: 'College of Computer Studies', is_active: 1 };
  vi.spyOn(referenceModel, 'findCollegeByName').mockResolvedValue([college]);
  vi.spyOn(referenceModel, 'findCollegeById').mockResolvedValue([college]);
  vi.spyOn(programs, 'lockCollege').mockResolvedValue(college);
  vi.spyOn(programs, 'findByName').mockResolvedValue({ name: 'BSIT', is_active: 1 });
});

describe('validateAnswers — driven entirely by the field definitions', () => {
  it.each([
    ['text', 'x'.repeat(256)], ['textarea', 'x'.repeat(2001)], ['tel', '9'.repeat(500)],
    ['tel', '+12025550123'], ['number', 'Infinity'], ['number', '1e3'], ['number', '0x10'], ['number', '1'.repeat(100)],
  ])('rejects excessive or malformed %s answers', (field_type, value) => {
    expect(service.validateAnswers([{ field_key: 'test', label: 'Test', field_type }], { test: value })).not.toEqual([]);
  });
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
    ['number', { year_graduated: 'not-a-year', program: 'BSIT' }, /Year Graduated must contain exactly four digits/],
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
  const valid = { answers: { year_graduated: '2024', college: 'College of Computer Studies', program: 'BSIT' } };

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
    expect(keys).toEqual(['year_graduated', 'college', 'program']);
  });

  it('publishes College and catalog-backed Degree Program without a migration', async () => {
    const { fields } = await service.getFormFields();
    expect(fields.map(f => f.field_key)).toEqual(['year_graduated', 'college', 'program', 'contact_email', 'grad_date']);
    expect(fields.find(f => f.field_key === 'college')).toMatchObject({ field_type: 'select', catalog: 'colleges', is_required: 1 });
    expect(fields.find(f => f.field_key === 'program')).toMatchObject({ field_type: 'select', catalog: 'programs' });
    gradModel.listFields.mockResolvedValue([FIELDS[0]]);
    expect((await service.getFormFields()).fields).toEqual([FIELDS[0]]);
  });

  it.each(['foreign', 'inactive'])('rejects an %s program before writing', async kind => {
    programs.findByName.mockResolvedValue(kind === 'foreign' ? null : { name: 'BSIT', is_active: 0 });
    await expect(service.submitApplication(STUDENT, valid)).rejects.toMatchObject({ status: 400 });
    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(gradModel.insertApplication).not.toHaveBeenCalled();
  });

  it('rejects an inactive college and missing college', async () => {
    referenceModel.findCollegeById.mockResolvedValue([{ id: 1, is_active: 0 }]);
    await expect(service.submitApplication(STUDENT, valid)).rejects.toMatchObject({ status: 400 });
    await expect(service.submitApplication(STUDENT, { answers: { year_graduated: '2024', program: 'BSIT' } }))
      .rejects.toThrow('College is required');
    expect(gradModel.insertApplication).not.toHaveBeenCalled();
  });

  it('rechecks catalog membership under transaction locks and rolls back on deactivation', async () => {
    programs.findByName.mockResolvedValueOnce({ name: 'BSIT', is_active: 1 }).mockResolvedValueOnce(null);
    await expect(service.submitApplication(STUDENT, valid)).rejects.toMatchObject({ status: 400 });
    expect(programs.lockCollege).toHaveBeenCalledWith(1, connection);
    expect(programs.findByName).toHaveBeenLastCalledWith(1, 'BSIT', connection, true);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(gradModel.insertApplication).not.toHaveBeenCalled();
  });

  it('stores canonical names without changing the profile academic fields', async () => {
    await service.submitApplication({ ...STUDENT, user_type: 'alumni' }, valid);
    expect(gradModel.insertValue).toHaveBeenCalledWith({ application_id: 42, field_key: 'college', value: 'College of Computer Studies' }, connection);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('commits an alumni application on the base schema without the legacy profile-completed column', async () => {
    // Exercise actual INSERT builders, rather than mocking every write away.
    gradModel.insertApplication.mockRestore();
    gradModel.insertValue.mockRestore();
    userModel.updateProfile.mockRestore();
    connection.query.mockImplementation(async sql => {
      if (/UPDATE users SET profile_completed/.test(sql)) {
        throw Object.assign(new Error("Unknown column 'profile_completed' in 'field list'"), { code: 'ER_BAD_FIELD_ERROR' });
      }
      if (/^INSERT INTO grad_applications /.test(sql)) return [{ insertId: 42 }];
      if (/^INSERT INTO grad_application_values /.test(sql)) return [{ affectedRows: 1 }];
      throw new Error('Unexpected application write');
    });
    await expect(service.submitApplication({ ...STUDENT, user_type: 'alumni' }, valid))
      .resolves.toMatchObject({ application_id: 42 });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    const answerWrites = connection.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO grad_application_values'));
    expect(answerWrites.map(([, params]) => params)).toEqual([
      [42, 'year_graduated', '2024'], [42, 'college', 'College of Computer Studies'], [42, 'program', 'BSIT'],
    ]);
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

  it('keeps saved college names and legacy program text readable without querying the current catalog', async () => {
    gradModel.findApplicationById.mockResolvedValue([APP]);
    gradModel.findValues.mockResolvedValue([
      { field_key: 'college', value: 'Former College Name' },
      { field_key: 'program', value: 'Legacy Degree Name' },
    ]);
    const { answers } = await service.getApplication(ADMIN, 42);
    expect(answers.find(a => a.field_key === 'college')).toMatchObject({ label: 'College', value: 'Former College Name' });
    expect(answers.find(a => a.field_key === 'program')).toMatchObject({ value: 'Legacy Degree Name' });
    expect(referenceModel.findCollegeByName).not.toHaveBeenCalled();
    expect(programs.findByName).not.toHaveBeenCalled();
  });
});

describe('staff review', () => {
  it('blocks students from the review queue', async () => {
    expect(await statusOf(service.listApplications(STUDENT))).toBe(403);
  });

  it.each([['an admin', ADMIN]])('allows %s', async (_label, user) => {
    await expect(service.listApplications(user)).resolves.toHaveProperty('applications');
  });

  it('blocks a student from deciding an application', async () => {
    expect(await statusOf(service.reviewApplication(STUDENT, 42, { status: 'approved' }))).toBe(403);
  });

  it.each(['under_review', 'approved', 'rejected'])('accepts the %s decision', async (status) => {
    gradModel.findApplicationById.mockResolvedValue([{id: 42, student_id: 'STU-001'}]);
    await expect(service.reviewApplication(ADMIN, 42, { status })).resolves.toBeTruthy();
    expect(gradModel.updateApplicationStatus).toHaveBeenCalledWith(42, status, ADMIN.id, null, connection);
  });

  it('rejects an unknown status', async () => {
    expect(await statusOf(service.reviewApplication(ADMIN, 42, { status: 'maybe' }))).toBe(400);
  });

  it('404s when the application does not exist', async () => {
    gradModel.updateApplicationStatus.mockResolvedValue([{ affectedRows: 0 }]);
    expect(await statusOf(service.reviewApplication(ADMIN, 999, { status: 'approved' }))).toBe(404);
  });
});

it.each(['-2020', '2020.5', '2e3', '2001', '9999', '202', ' 2024', 2024])('rejects invalid college graduation in the alumni application before any write: %s', async year_graduated => {
  expect(await statusOf(service.submitApplication(STUDENT, { answers: { year_graduated, program: 'BSIT' } }))).toBe(400);
  expect(gradModel.insertApplication).not.toHaveBeenCalled();
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('keeps unrelated configurable number fields numeric', () => {
  expect(service.validateAnswers([{ field_key: 'quantity', field_type: 'number', label: 'Quantity' }], { quantity: '1.5' })).toEqual([]);
});

it('denies Finance graduate reviews and reads', async () => {
  gradModel.findApplicationById.mockResolvedValue([{id:42,student_id:'STU-001'}]);
  expect(await statusOf(service.listApplications(CLERK))).toBe(403);
  expect(await statusOf(service.getApplication(CLERK,42))).toBe(403);
  expect(await statusOf(service.reviewApplication(CLERK,42,{status:'approved'}))).toBe(403);
  expect(gradModel.updateApplicationStatus).not.toHaveBeenCalled();
});
