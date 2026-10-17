import { beforeEach, expect, it } from 'vitest';
import { handleSessionFailure } from '@/utils/apiSession';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
const failure = (url = '/auth/me', token = 'expired', status = 401) => ({ response: { status }, config: { url, method: 'get', headers: { Authorization: `Bearer ${token}` } } });
function run(error, path = '/signup') {
  const location = { pathname: path, href: path };
  handleSessionFailure(error, { storage: sessionStorage, location });
  return location;
}
function cache(token = 'expired') { sessionStorage.setItem('trace_token', token); sessionStorage.setItem('trace_user', '{"id":3}'); }

it.each(['/reference/programs', '/reference/colleges', '/reference/programs?includeInactive=true', 'https://synthetic.example.test/api/reference/programs'])('leaves public catalog failures to the form without erasing a session (%s)', path => {
  cache();
  expect(run(failure(path)).href).toBe('/signup');
  expect(sessionStorage.getItem('trace_token')).toBe('expired');
  expect(sessionStorage.getItem('trace_user')).toBe('{"id":3}');
});
it('keeps an anonymous signup open when an older backend rejects the new program read', () => {
  expect(run({ response: { status: 401 }, config: { url: '/reference/programs', method: 'get', headers: {} } }).href).toBe('/signup');
});
it.each(['/signup', '/', '/forgot-password', '/reset-password', '/verify-email', '/staff-setup', '/dashboard-help'])('clears an expired cached session without navigating away from a public page (%s)', path => {
  cache();
  expect(run(failure(), path).href).toBe(path);
  expect(sessionStorage.getItem('trace_token')).toBeNull();
  expect(sessionStorage.getItem('trace_user')).toBeNull();
});
it.each(['/dashboard', '/dashboard/', '/dashboard/requests'])('retains the login redirect for an expired protected session (%s)', path => {
  cache();
  expect(run(failure(), path).href).toBe('/');
  expect(sessionStorage.getItem('trace_token')).toBeNull();
  expect(sessionStorage.getItem('trace_user')).toBeNull();
});
it('does not let a delayed failure erase a newer login', () => {
  cache('new-session');
  expect(run(failure('/documents', 'old-session'), '/dashboard').href).toBe('/dashboard');
  expect(sessionStorage.getItem('trace_token')).toBe('new-session');
  expect(sessionStorage.getItem('trace_user')).toBe('{"id":3}');
});
it.each(['/auth/login', '/auth/verify-2fa', '/auth/verify-email-change'])('keeps credential/challenge failures local (%s)', path => {
  cache();
  expect(run(failure(path), '/dashboard').href).toBe('/dashboard');
  expect(sessionStorage.getItem('trace_token')).toBe('expired');
});
it.each([400, 403, 404, 500, 503])('does not treat HTTP %s as an expired session', status => {
  cache();
  expect(run(failure('/documents', 'expired', status), '/dashboard').href).toBe('/dashboard');
  expect(sessionStorage.getItem('trace_token')).toBe('expired');
});
