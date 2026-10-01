const KEY = 'trace_clerk_browser_until';

// This preference is not a credential. The API still verifies its HttpOnly proof.
export function hasClerkBrowserPreference() {
  try {
    const until = Number(localStorage.getItem(KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch { return false; }
}

export function forgetClerkBrowserPreference() {
  try { localStorage.removeItem(KEY); } catch { /* Shared mode is the default. */ }
}

export function rememberClerkBrowserPreference(data, optedIn) {
  if (data?.user?.role !== 'clerk') return;
  const until = Date.parse(data.browser_trusted_until);
  if (optedIn && Number.isFinite(until) && until > Date.now()) {
    try { localStorage.setItem(KEY, String(until)); } catch { /* OTP remains available. */ }
  } else forgetClerkBrowserPreference();
}
