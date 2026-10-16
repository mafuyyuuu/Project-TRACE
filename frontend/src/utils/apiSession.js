const challengePaths = ['/auth/login', '/auth/verify-2fa', '/auth/verify-email-change'];
const publicCatalogPaths = ['/reference/colleges', '/reference/programs'];
const matchesPath = (url, path) => url === path || url.endsWith(`/api${path}`);

/** A failed public request must not navigate an applicant out of their form. */
export function handleSessionFailure(error, { storage, location }) {
  if (error.response?.status !== 401) return;
  const config = error.config;
  const url = String(config?.url || '').split(/[?#]/)[0];
  if (challengePaths.some(path => matchesPath(url, path))) return;
  if ((!config?.method || config.method.toLowerCase() === 'get') && publicCatalogPaths.some(path => matchesPath(url, path))) return;

  const token = storage.getItem('trace_token');
  const authorization = config?.headers?.get?.('Authorization') || config?.headers?.Authorization || config?.headers?.authorization;
  // A slow failure from an older request cannot erase a newly signed-in session.
  if (token && authorization !== `Bearer ${token}`) return;
  storage.removeItem('trace_token');
  storage.removeItem('trace_user');
  if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')) location.href = '/';
}
