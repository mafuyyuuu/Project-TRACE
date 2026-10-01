const model = require('../user.model');
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
