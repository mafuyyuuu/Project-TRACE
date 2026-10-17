const keys = new Set(['trace_token', 'trace_user']);
const initialized = 'trace_tab_session_initialized';
const memory = new Map();

function tabStorage() {
  try { return window.sessionStorage; } catch { return null; }
}
function read(key) {
  try { const storage = tabStorage(); return storage ? storage.getItem(key) : memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
function write(key, value) {
  memory.set(key, String(value));
  try { tabStorage()?.setItem(key, String(value)); } catch { /* Keep this tab usable when storage is blocked. */ }
}
function remove(key) {
  memory.delete(key);
  try { tabStorage()?.removeItem(key); } catch { /* The in-memory session is already cleared. */ }
}

/**
 * Adopt an existing deployment's session once per tab. Keep its shared token
 * unchanged so an older, already-open tab can still reload as its own actor.
 * New sign-ins never write shared credentials. The server still validates every token.
 */
function adoptLegacySession() {
  if (read(initialized)) return;
  write(initialized, '1');
  if (read('trace_token')) return;
  try {
    const token = localStorage.getItem('trace_token');
    if (!token) return;
    write('trace_token', token);
    const user = localStorage.getItem('trace_user');
    if (user) write('trace_user', user);
  } catch { /* A legacy cache is optional. */ }
}

/** Storage-compatible adapter: authentication is isolated to this browser tab. */
export const authStorage = {
  getItem(key) {
    if (!keys.has(key)) return null;
    adoptLegacySession();
    return read(key);
  },
  setItem(key, value) {
    if (!keys.has(key)) return;
    write(initialized, '1');
    write(key, value);
  },
  removeItem(key) {
    if (!keys.has(key)) return;
    write(initialized, '1');
    if (key === 'trace_token') {
      const token = read(key);
      try {
        if (token && localStorage.getItem(key) === token) {
          localStorage.removeItem('trace_token');
          localStorage.removeItem('trace_user');
        }
      } catch { /* Shared legacy storage may be unavailable. */ }
    }
    remove(key);
  },
};

export function readCachedUser() {
  try { return JSON.parse(authStorage.getItem('trace_user') || 'null'); }
  catch { authStorage.removeItem('trace_user'); return null; }
}
