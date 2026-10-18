// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../../../../vercel.json', import.meta.url), 'utf8'));

it('enables first-party auth and routes it before the SPA fallback', () => {
  expect(config.buildCommand).toContain('VITE_AUTH_PROXY=true npm run build');
  expect(config.rewrites[0]).toEqual({ source: '/api/auth/:path*', destination: 'https://trace-plp-api.duckdns.org/api/auth/:path*' });
  const spa = new RegExp(`^${config.rewrites[1].source}$`);
  for (const path of ['/api/auth/login', '/api/auth/verify-2fa', '/api/auth/me', '/api/auth/profile/picture', '/api/unknown', '/assets/app.js']) expect(spa.test(path)).toBe(false);
  for (const path of ['/', '/dashboard', '/reset-password']) expect(spa.test(path)).toBe(true);
});
