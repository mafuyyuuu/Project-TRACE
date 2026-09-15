/**
 * Database TLS configuration.
 *
 * Managed MySQL generally refuses a plaintext connection, so getting this
 * wrong means the first query of a deployment fails — while a local MySQL has
 * no certificate at all and must stay unaffected.
 */
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'db.js');
const ENV_PATH = path.resolve(__dirname, '..', 'env.js');

/** Reload the config chain so changed env vars are actually picked up. */
function loadWith(vars) {
  delete require.cache[DB_PATH];
  delete require.cache[ENV_PATH];
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const mod = require(DB_PATH);
  const result = mod.sslOptions();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return result;
}

afterAll(() => {
  delete require.cache[DB_PATH];
  delete require.cache[ENV_PATH];
});

describe('sslOptions', () => {
  it('is off by default, so a local MySQL still connects', () => {
    expect(loadWith({ DB_SSL: undefined, DB_SSL_CA: undefined })).toBeUndefined();
  });

  it('is off for any value other than an explicit true', () => {
    expect(loadWith({ DB_SSL: 'false', DB_SSL_CA: undefined })).toBeUndefined();
    expect(loadWith({ DB_SSL: '', DB_SSL_CA: undefined })).toBeUndefined();
  });

  it('verifies against the system trust store when enabled without a CA', () => {
    expect(loadWith({ DB_SSL: 'true', DB_SSL_CA: undefined })).toEqual({ rejectUnauthorized: true });
  });

  it('uses a provider-supplied CA when one is given', () => {
    const opts = loadWith({ DB_SSL: 'true', DB_SSL_CA: '-----BEGIN CERTIFICATE-----abc' });
    expect(opts).toEqual({ ca: '-----BEGIN CERTIFICATE-----abc', rejectUnauthorized: true });
  });

  it('never disables certificate verification', () => {
    // A provider that needs TLS is not helped by accepting any certificate;
    // that would leave the connection open to interception.
    for (const vars of [{ DB_SSL: 'true' }, { DB_SSL: 'true', DB_SSL_CA: 'x' }]) {
      const opts = loadWith({ DB_SSL_CA: undefined, ...vars });
      expect(opts.rejectUnauthorized).toBe(true);
    }
  });

  it('accepts TRUE in any casing', () => {
    expect(loadWith({ DB_SSL: 'TRUE', DB_SSL_CA: undefined })).toEqual({ rejectUnauthorized: true });
  });
});
