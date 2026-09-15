/**
 * The CORS allowlist is shared by the REST API and the Socket.IO handshake.
 * Getting it wrong in the permissive direction means any website can open an
 * authenticated socket, so the two modes are pinned here.
 */
const path = require('path');

const CORS_PATH = path.resolve(__dirname, '..', 'cors.js');
const ENV_PATH = path.resolve(__dirname, '..', 'env.js');

/** Reload the config chain so a changed FRONTEND_URL is actually picked up. */
function loadWith(frontendUrl) {
  delete require.cache[CORS_PATH];
  delete require.cache[ENV_PATH];
  const previous = process.env.FRONTEND_URL;
  if (frontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = frontendUrl;
  const mod = require(CORS_PATH);
  const result = { corsOrigin: mod.corsOrigin(), allowedOrigins: mod.allowedOrigins() };
  if (previous === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = previous;
  return result;
}

afterAll(() => {
  delete require.cache[CORS_PATH];
  delete require.cache[ENV_PATH];
});

describe('corsOrigin', () => {
  it('reflects any origin when FRONTEND_URL is unset (development)', () => {
    expect(loadWith(undefined).corsOrigin).toBe(true);
  });

  it('restricts to the configured origin once FRONTEND_URL is set', () => {
    expect(loadWith('https://trace.plp.edu.ph').corsOrigin).toEqual(['https://trace.plp.edu.ph']);
  });

  it('accepts a comma-separated list so staging and production can coexist', () => {
    expect(loadWith('https://trace.plp.edu.ph, https://staging.trace.plp.edu.ph').corsOrigin).toEqual([
      'https://trace.plp.edu.ph',
      'https://staging.trace.plp.edu.ph',
    ]);
  });

  it('treats a blank or comma-only value as unset rather than as an empty allowlist', () => {
    // An empty array would refuse every origin, including the app's own.
    expect(loadWith('   ').corsOrigin).toBe(true);
    expect(loadWith(' , ').corsOrigin).toBe(true);
  });
});
