const fs = require('fs');
const service = require('../aiEngine.service');

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('parses a successful response with an abort signal', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ forecast: [1] }) });
  vi.stubGlobal('fetch', fetchMock);
  expect(await service.getForecast()).toEqual({ forecast: [1] });
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});
it.each(['connection', 'body'])('falls back after 15 seconds while waiting for the %s', async phase => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn((_url, { signal }) => {
    const stalled = () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError'))));
    return phase === 'connection' ? stalled() : Promise.resolve({ ok: true, json: stalled });
  }));
  const pending = service.getForecast();
  await vi.advanceTimersByTimeAsync(15000);
  expect(await pending).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it('does not treat a non-success HTTP response as usable AI output', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  expect(await service.getInsights()).toBeNull();
});
it('preserves registration fallback when verification is unavailable', async () => {
  vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('proof'));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  expect(await service.verifyIdDocument({ path: '/unused/proof', mimetype: 'image/png', originalname: 'proof.png' }, { studentId: 'STU-1', course: 'Engineering' })).toBeNull();
});

it('uses the structured identity endpoint with a bounded call and manual fallback', async () => {
  vi.useFakeTimers();
  vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('proof'));
  const fetchMock = vi.fn((_url, { signal }) => new Promise((_resolve, reject) =>
    signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))));
  vi.stubGlobal('fetch', fetchMock);
  const pending = service.extractIdentity({ path: '/unused/proof', mimetype: 'image/png', originalname: 'proof.png' });
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/ocr\/identity$/);
  await vi.advanceTimersByTimeAsync(15000);
  expect(await pending).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
