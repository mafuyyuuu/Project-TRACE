const KEY = 'trace_browser_trust_until';
const LEGACY_KEY = 'trace_clerk_browser_until';

// This preference is not a credential. The API still verifies its HttpOnly proof.
export function hasBrowserTrustPreference() {
  try {
    const until = Number(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch { return false; }
}

export function forgetBrowserTrustPreference() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); } catch { /* Shared mode is the default. */ }
}

export function rememberBrowserTrustPreference(data, optedIn) {
  if (!['clerk', 'admin'].includes(data?.user?.role)) return;
  const until = Date.parse(data.browser_trusted_until);
  if (optedIn && Number.isFinite(until) && until > Date.now()) {
    try { localStorage.setItem(KEY, String(until)); } catch { /* OTP remains available. */ }
  } else forgetBrowserTrustPreference();
}
