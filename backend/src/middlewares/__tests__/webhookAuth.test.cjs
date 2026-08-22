/**
 * Guards the fix for the fully-open machine-to-machine endpoints
 * (/documents/assign and the payment webhooks).
 */
const env = require('../../config/env');
const { verifyWebhookSecret } = require('../webhookAuth.middleware');

function mockReq(secret) {
  return {
    method: 'POST',
    originalUrl: '/api/documents/assign',
    get: (name) => (name === 'x-webhook-secret' ? secret : undefined),
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('verifyWebhookSecret', () => {
  it('rejects a request with no secret header', () => {
    const res = mockRes();
    const next = vi.fn();
    verifyWebhookSecret(mockReq(undefined), res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an empty secret', () => {
    const res = mockRes();
    const next = vi.fn();
    verifyWebhookSecret(mockReq(''), res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret of a different length', () => {
    const res = mockRes();
    const next = vi.fn();
    verifyWebhookSecret(mockReq('nope'), res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret of the SAME length (constant-time path)', () => {
    const sameLengthWrong = 'x'.repeat(env.WEBHOOK_SECRET.length);
    expect(sameLengthWrong).toHaveLength(env.WEBHOOK_SECRET.length);
    expect(sameLengthWrong).not.toBe(env.WEBHOOK_SECRET);

    const res = mockRes();
    const next = vi.fn();
    verifyWebhookSecret(mockReq(sameLengthWrong), res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts the correct secret', () => {
    const res = mockRes();
    const next = vi.fn();
    verifyWebhookSecret(mockReq(env.WEBHOOK_SECRET), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeNull();
  });

  it('does not leak the expected secret in the error body', () => {
    const res = mockRes();
    verifyWebhookSecret(mockReq('wrong'), res, vi.fn());
    expect(JSON.stringify(res.body)).not.toContain(env.WEBHOOK_SECRET);
  });

  it('logs the rejected call for auditing', () => {
    verifyWebhookSecret(mockReq('wrong'), mockRes(), vi.fn());
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('/api/documents/assign'));
  });
});
