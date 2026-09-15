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

afterEach(() => {
  import.meta.env.VITE_API_URL = original;
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
});
