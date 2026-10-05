const model = require('../user.model');
it.each(['STU2024001', 'FINANCE001', 'student@plp.edu.ph'])('resolves active student/staff/email identifiers with parameterized lookup: %s', async identifier => {
  const rows = [{ id: 3, email: 'registered@plp.edu.ph' }];
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  await expect(model.findActiveByStudentIdOrEmail(identifier, executor)).resolves.toEqual(rows);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('(student_id = ? OR email = ?) AND is_active = TRUE');
  expect(sql).not.toContain('pending_email');
  expect(params).toEqual([identifier, identifier]);
});
it('returns the entered program and college for pending registration review without credentials', async () => {
  const rows = [{ id: 3, program: 'BS Computer Science', course: 'College A', college_id: 2 }];
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  await expect(model.listPendingStudents(executor)).resolves.toEqual(rows);
  const [sql] = executor.query.mock.calls[0];
  expect(sql).toContain('course, program, college_id');
  expect(sql).not.toMatch(/SELECT \*|password|otp|token|secret/);
});
it('returns protected photo/proof paths in the safe Admin account list', async () => {
  const rows = [{ id: 3, profile_picture: 'avatar-test.jpg', id_proof_path: '/uploads/proof-test.jpg' }];
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  await expect(model.listAllUsers(executor)).resolves.toEqual(rows);
  const [sql] = executor.query.mock.calls[0];
  expect(sql).toContain('profile_picture, id_proof_path');
  expect(sql).not.toMatch(/SELECT \*|password|otp|token|secret/);
});
it.each([false, true])('reads saved personal/education fields and optionally locks the account: %s', async lock => {
  const rows = [{ id: 3, role: 'student', birth_date: '2000-01-01', elem_school: 'Elementary' }];
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  await expect(model.getProfileById(3, executor, lock)).resolves.toEqual(rows);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('LEFT JOIN student_profiles p ON p.user_id = u.id');
  for (const field of ['birth_date', 'home_address', 'civil_status', 'maiden_name', 'previous_school', 'is_transfer_student',
    'last_attendance_year', 'elem_school', 'elem_grad_year', 'jhs_school', 'jhs_grad_year', 'shs_school', 'shs_grad_year']) expect(sql).toContain('p.' + field);
  expect(sql).not.toMatch(/password_hash|otp|u\.\*/);
  expect(sql.endsWith(' FOR UPDATE')).toBe(lock);
  expect(params).toEqual([3]);
});
it('checks three distinct prior hashes without counting repeated current-password history rows', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.getPasswordHistory(3, executor, 'current-hash');
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('password_hash <> ?'); expect(sql).toContain('GROUP BY password_hash');
  expect(sql).toContain('LIMIT 3'); expect(params).toEqual([3, 'current-hash']);
});
