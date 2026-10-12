import { expect, it } from 'vitest';
import { validNewPassword, PASSWORD_REQUIREMENTS } from '@/utils/passwordPolicy';
import backendPolicy from '../../../../backend/src/utils/passwordPolicy.js';

it.each([
  ['Trace_2026', true], ['Aa1_' + 'a'.repeat(60), true],
  ...['@', '$', '!', '%', '*', '?', '&'].map(symbol => ['Trace2026' + symbol, true]),
  ['Aa1_aaa', false], ['Aa1_' + 'a'.repeat(61), false], ['trace_2026', false],
  ['TRACE_2026', false], ['Trace_only', false], ['Trace2026', false],
  ['Trace2026_', true], ['Trace2026-!', false], ['Trace 2026_', false],
  [null, false], [12345678, false],
])('uses identical frontend/backend rules for %s', (password, expected) => {
  expect(validNewPassword(password)).toBe(expected);
  expect(backendPolicy.validNewPassword(password)).toBe(expected);
  if (!expected) expect(() => backendPolicy.validatePassword(password)).toThrow();
  else expect(() => backendPolicy.validatePassword(password)).not.toThrow();
});
it('lists underscore in both requirement messages', () => {
  expect(PASSWORD_REQUIREMENTS).toContain('@$!%*?&_');
  expect(backendPolicy.PASSWORD_REQUIREMENTS).toContain('@$!%*?&_');
});
