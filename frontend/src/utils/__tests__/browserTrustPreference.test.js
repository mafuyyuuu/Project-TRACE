import { beforeEach, expect, it, vi, afterEach } from 'vitest';
import { hasBrowserTrustPreference, rememberBrowserTrustPreference, forgetBrowserTrustPreference } from '../browserTrustPreference';
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T03:00:00Z')); });
afterEach(() => vi.useRealTimers());
it('requires explicit consent and a server-confirmed future clerk grant', () => {
  expect(hasBrowserTrustPreference()).toBe(false);
  const result = { user: { role: 'clerk' }, browser_trusted_until: '2026-10-01T16:00:00Z' };
  rememberBrowserTrustPreference(result, false);
  expect(hasBrowserTrustPreference()).toBe(false);
  rememberBrowserTrustPreference(result, true);
  expect(hasBrowserTrustPreference()).toBe(true);
  vi.setSystemTime(new Date(result.browser_trusted_until));
  expect(hasBrowserTrustPreference()).toBe(false);
});
it.each(['student', 'unknown'])('never remembers a grant for %s', role => {
  rememberBrowserTrustPreference({ user: { role }, browser_trusted_until: '2026-10-01T16:00:00Z' }, true);
  expect(hasBrowserTrustPreference()).toBe(false);
});
it('remembers an opted-in Admin grant and removes legacy preferences when switching to shared mode', () => {
  localStorage.setItem('trace_clerk_browser_until', String(Date.now() + 60000));
  expect(hasBrowserTrustPreference()).toBe(true);
  rememberBrowserTrustPreference({ user: { role: 'admin' }, browser_trusted_until: '2026-10-01T16:00:00Z' }, true);
  expect(hasBrowserTrustPreference()).toBe(true);
  forgetBrowserTrustPreference();
  expect(localStorage.getItem('trace_browser_trust_until')).toBeNull();
  expect(localStorage.getItem('trace_clerk_browser_until')).toBeNull();
});
it('rejects missing grants and supports returning to shared mode', () => {
  rememberBrowserTrustPreference({ user: { role: 'clerk' } }, true);
  expect(hasBrowserTrustPreference()).toBe(false);
  rememberBrowserTrustPreference({ user: { role: 'clerk' }, browser_trusted_until: '2026-10-01T16:00:00Z' }, true);
  forgetBrowserTrustPreference();
  expect(hasBrowserTrustPreference()).toBe(false);
});
