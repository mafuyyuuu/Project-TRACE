import { it, expect } from 'vitest';
import { PROFILE_YEAR_FIELDS, yearError, studyYearErrors, profileYearErrors, manilaYear } from '../profileYears';
const NOW = new Date('2026-10-05T00:00:00Z');
const COLLEGE = PROFILE_YEAR_FIELDS.graduation_year;
it.each(['-2020', '2020.5', '2e3', '2.026e3', '202', '20265', 'abcd', '+2020', ' 2020', '2020 ', '２０２０', '0000', 2020])('rejects malformed draft %s without normalizing it', value => {
  expect(yearError(value, COLLEGE, NOW)).toMatch(/exactly four digits/);
});
it.each(['2001', '2027'])('rejects college year outside the approved range: %s', value => {
  expect(yearError(value, COLLEGE, NOW)).toBe('PLP/College Year Graduated must be between 2002 and 2026.');
});
it.each(['2002', '2026'])('accepts college boundary %s', value => expect(yearError(value, COLLEGE, NOW)).toBe(''));
it('allows historical school and attendance years independently of college graduation', () => {
  for (const field of ['elem_grad_year', 'jhs_grad_year', 'shs_grad_year', 'last_attendance_year']) {
    expect(yearError('1980', PROFILE_YEAR_FIELDS[field], NOW)).toBe('');
    expect(yearError('2027', PROFILE_YEAR_FIELDS[field], NOW)).not.toBe('');
  }
});
it('uses Manila midnight at New Year rather than the host timezone', () => {
  expect(manilaYear(new Date('2026-12-31T15:59:59Z'))).toBe(2026);
  expect(manilaYear(new Date('2026-12-31T16:00:00Z'))).toBe(2027);
  expect(yearError('2027', COLLEGE, new Date('2026-12-31T16:00:00Z'))).toBe('');
});
it('requires only college graduation for alumni drafts while allowing partial contact updates', () => {
  const alumni = { role: 'student', user_type: 'alumni' };
  expect(profileYearErrors({ graduation_year: '' }, alumni, { now: NOW })).toHaveProperty('graduation_year');
  expect(profileYearErrors({ graduation_year: '' }, { role: 'student', user_type: 'student' }, { now: NOW })).toEqual({});
  expect(profileYearErrors({ graduation_year: '' }, { role: 'clerk', user_type: 'alumni' }, { now: NOW })).toEqual({});
  expect(profileYearErrors({}, alumni, { onlyProvided: true, now: NOW })).toEqual({});
});

it.each([['2002', '2012'], ['2020', '2020'], ['2020', '2026']])('accepts a study interval within ten years: %s–%s', (year_started, graduation_year) => {
  expect(studyYearErrors({ year_started, graduation_year }, { required: true, now: NOW })).toEqual({});
});
it.each([['2002', '2013'], ['2024', '2020']])('rejects an overlong or reversed study interval: %s–%s', (year_started, graduation_year) => {
  expect(studyYearErrors({ year_started, graduation_year }, { required: true, now: NOW })).toHaveProperty('graduation_year');
});
it('allows blank optional current-student years but requires both alumni years', () => {
  expect(studyYearErrors({ year_started: '', graduation_year: '' }, { now: NOW })).toEqual({});
  expect(Object.keys(studyYearErrors({}, { required: true, now: NOW }))).toEqual(['year_started', 'graduation_year']);
  expect(studyYearErrors({ graduation_year: '2024' }, { now: NOW })).toHaveProperty('year_started');
});
