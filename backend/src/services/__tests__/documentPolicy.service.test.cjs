const users = require('../../models/user.model');
const refs = require('../../models/referenceData.model');
const documents = require('../../models/document.model');
const policy = require('../documentPolicy.service');
const referenceService = require('../referenceData.service');
const student = { student_id: 'STU1', user_type: 'student', college_id: 2 };
const type = { name: 'Test', available_to: 'both', is_active: 1, is_repeatable: 1 };

beforeEach(() => {
  vi.spyOn(documents, 'countBlockingRequests').mockResolvedValue(0);
  vi.spyOn(users, 'findStudentForPolicy').mockResolvedValue([student]);
  vi.spyOn(refs, 'findCollegeByName').mockResolvedValue([]);
});
it('checks the target applicant and college, not the staff member filing the request', async () => {
  expect(await policy.eligibility({ ...type, available_to: 'alumni' }, student, { counter: true })).toMatch(/applicant/);
  expect(await policy.eligibility({ ...type, allowed_college_ids: [3] }, student)).toMatch(/college/);
  expect(await policy.eligibility({ ...type, allowed_college_ids: [2] }, student)).toBeNull();
});
it('blocks unknown colleges for restricted types but permits unrestricted types', async () => {
  expect(await policy.eligibility({ ...type, allowed_college_ids: [2] }, { ...student, college_id: null })).toMatch(/college/);
  expect(await policy.eligibility(type, { ...student, college_id: null })).toBeNull();
});
it('allows counter-only types at Window 1 and blocks online requests', async () => {
  expect(await policy.eligibility({ ...type, is_walk_in: 1 }, student)).toMatch(/Window 1/);
  expect(await policy.eligibility({ ...type, is_walk_in: 1 }, student, { counter: true })).toBeNull();
});
it('blocks duplicate Honorable Dismissal requests and quantities greater than one', async () => {
  const dismissal = { ...type, name: 'Honorable Dismissal' };
  documents.countBlockingRequests.mockResolvedValue(1);
  await expect(policy.assertAllowed(dismissal, student)).rejects.toMatchObject({ status: 400 });
  documents.countBlockingRequests.mockResolvedValue(0);
  await expect(policy.assertAllowed(dismissal, student, { copies: 2 })).rejects.toThrow(/one copy/);
  await expect(policy.assertAllowed(dismissal, student, { copies: 1, excludeId: 9 })).resolves.toBeUndefined();
  expect(documents.countBlockingRequests).toHaveBeenLastCalledWith('Honorable Dismissal', 'STU1', 9, expect.anything());
});
it('locks the student row and resolves only exact college-name matches', async () => {
  users.findStudentForPolicy.mockResolvedValue([{ ...student, college_id: null, course: 'College A' }]);
  refs.findCollegeByName.mockResolvedValue([{ id: 7, name: 'college a' }]);
  const executor = {};
  expect((await policy.resolveStudent('STU1', executor, true)).college_id).toBeNull();
  expect(users.findStudentForPolicy).toHaveBeenCalledWith('STU1', executor, true);
  refs.findCollegeByName.mockResolvedValue([{ id: 7, name: 'College A' }]);
  expect((await policy.resolveStudent('STU1', executor, true)).college_id).toBe(7);
});
it('requires identification before a restricted scan can advance', async () => {
  expect(await policy.eligibility({ ...type, available_to: 'student' }, null, { counter: true })).toMatch(/Identify/);
});

it('excludes only terminal legacy rejection and the request being evaluated from repeat checks', async () => {
  documents.countBlockingRequests.mockRestore();
  const executor = { query: vi.fn().mockResolvedValue([[{ count: 1 }]]) };
  await documents.countBlockingRequests('Honorable Dismissal', 'STU1', 9, executor);
  const [sql, values] = executor.query.mock.calls[0];
  expect(sql).toMatch(/COALESCE\(current_status, ''\)\s*<>\s*\?/);
  expect(values).toContain('REJECTED');
  expect(values).toContain(9);
  expect(values).not.toContain('PENDING_W1_INTAKE');
});

it.each([...policy.RETIRED_DOCUMENT_NAMES, '  certificate  OF good moral  '])('blocks new online, counter, and unidentified scan requests for %s even before migration', async name => {
  const retired = { ...type, name };
  await expect(policy.assertAllowed(retired, student)).rejects.toThrow(/no longer available/);
  await expect(policy.assertAllowed(retired, student, { counter: true })).rejects.toThrow(/no longer available/);
  await expect(policy.assertAllowed(retired, null, { counter: true, allowUnidentified: true })).rejects.toThrow(/no longer available/);
});

it('permits an existing retired request to continue, but forbids changing another request to a retired type', async () => {
  const oldType = { ...type, name: 'Certificate of Good Moral', is_active: 0 };
  vi.spyOn(refs, 'findDocumentTypeByName').mockResolvedValue([oldType]);
  const doc = { id: 9, student_id: 'STU1', document_type: oldType.name, copies: 1 };
  await expect(policy.assertDocument(doc)).resolves.toEqual(oldType);
  await expect(policy.assertDocument({ ...doc, document_type: 'Diploma' }, { documentType: oldType.name }))
    .rejects.toThrow(/no longer available/);
});

it('removes retired aliases from reference options while retaining configured fees', async () => {
  vi.spyOn(refs, 'listDocumentTypes').mockResolvedValue([
    ...policy.RETIRED_DOCUMENT_NAMES.map(name => ({ ...type, name, base_fee: '50.00' })),
    { ...type, name: 'Diploma', base_fee: '325.00' },
  ]);
  const result = await referenceService.listDocumentTypes();
  expect(result.document_types.map(row => row.name)).toEqual(['Diploma']);
  expect(result.document_types[0].base_fee).toBe(325);
});
