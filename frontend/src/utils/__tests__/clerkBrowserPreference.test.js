import { beforeEach, expect, it, vi, afterEach } from 'vitest';
import { hasClerkBrowserPreference, rememberClerkBrowserPreference, forgetClerkBrowserPreference } from '../clerkBrowserPreference';
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T03:00:00Z')); });
afterEach(() => vi.useRealTimers());
it('requires explicit consent and a server-confirmed future clerk grant', () => {
  expect(hasClerkBrowserPreference()).toBe(false);
  const result = { user: { role: 'clerk' }, browser_trusted_until: '2026-10-01T16:00:00Z' };
  rememberClerkBrowserPreference(result, false);
  expect(hasClerkBrowserPreference()).toBe(false);
  rememberClerkBrowserPreference(result, true);
  expect(hasClerkBrowserPreference()).toBe(true);
  vi.setSystemTime(new Date(result.browser_trusted_until));
  expect(hasClerkBrowserPreference()).toBe(false);
});
it.each(['admin', 'student'])('never remembers a grant for %s', role => {
  rememberClerkBrowserPreference({ user: { role }, browser_trusted_until: '2026-10-01T16:00:00Z' }, true);
  expect(hasClerkBrowserPreference()).toBe(false);
});
it('rejects missing grants and supports returning to shared mode', () => {
  rememberClerkBrowserPreference({ user: { role: 'clerk' } }, true);
  expect(hasClerkBrowserPreference()).toBe(false);
  rememberClerkBrowserPreference({ user: { role: 'clerk' }, browser_trusted_until: '2026-10-01T16:00:00Z' }, true);
  forgetClerkBrowserPreference();
  expect(hasClerkBrowserPreference()).toBe(false);
});
