import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Where the built SPA sends its requests.
 *
 * In development everything is relative and the Vite dev proxy forwards it. In
 * a deployment the frontend and API are on different origins, and that proxy
 * does not exist in a `vite build` — so this is what stands between a working
 * deployment and every request 404ing against the static host.
 */

async function freshApi() {
  vi.resetModules();
  return (await import('@/services/api')).default;
}

const original = import.meta.env.VITE_API_URL;
const originalProxy = import.meta.env.VITE_AUTH_PROXY;

afterEach(() => {
  import.meta.env.VITE_API_URL = original;
  import.meta.env.VITE_AUTH_PROXY = originalProxy;
});

describe('api baseURL', () => {
  it('stays relative when VITE_API_URL is unset, so the dev proxy still works', async () => {
    delete import.meta.env.VITE_API_URL;
    expect((await freshApi()).defaults.baseURL).toBe('/api');
  });

  it('stays relative when VITE_API_URL is an empty string', async () => {
    // Vercel supplies a declared-but-empty variable as '', which must behave
    // like "same origin" rather than producing a broken absolute URL.
    import.meta.env.VITE_API_URL = '';
    expect((await freshApi()).defaults.baseURL).toBe('/api');
  });

  it('targets the API host when VITE_API_URL is set', async () => {
    import.meta.env.VITE_API_URL = 'https://api.trace.example.com';
    expect((await freshApi()).defaults.baseURL).toBe('https://api.trace.example.com/api');
  });

  it('uses the first-party proxy for authentication while retaining direct API traffic', async () => {
    import.meta.env.VITE_API_URL = 'https://api.trace.example.com';
    import.meta.env.VITE_AUTH_PROXY = 'true';
    const api = await freshApi();
    const adapter = async config => ({ config, data: {}, status: 200, statusText: 'OK', headers: {} });
    for (const url of ['/auth/login', '/auth/verify-2fa', '/auth/logout', '/auth/profile', '/auth/authenticator']) {
      const response = await api.post(url, { sample: true }, { adapter });
      expect(api.getUri(response.config)).toBe(`/api${url}`);
      expect(response.config.withCredentials).toBe(true);
    }
    const response = await api.get('/documents/forecast', { adapter });
    expect(api.getUri(response.config)).toBe('https://api.trace.example.com/api/documents/forecast');
    const unrelated = await api.get('/authenticity', { adapter });
    expect(api.getUri(unrelated.config)).toBe('https://api.trace.example.com/api/authenticity');
  });

  it('preserves direct authentication for deployments without the proxy', async () => {
    import.meta.env.VITE_API_URL = 'https://api.trace.example.com';
    import.meta.env.VITE_AUTH_PROXY = 'false';
    const api = await freshApi();
    const response = await api.post('/auth/login', {}, { adapter: async config => ({ config, data: {}, status: 200, headers: {} }) });
    expect(api.getUri(response.config)).toBe('https://api.trace.example.com/api/auth/login');
  });
});
