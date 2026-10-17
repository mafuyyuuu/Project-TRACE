const fs = require('fs');
const service = require('../aiEngine.service');
it('posts only the supplied aggregate snapshot for prototype classification', async () => {
  const payload = { counts: { SEC_PROCESSING: 60 }, today_actions: 5, unclassified: 0, as_of: '2026-10-12T00:00:00Z' };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ prediction: 0, source: 'random_forest_prototype', training_samples: 4, validated: false }) });
  vi.stubGlobal('fetch', fetchMock);
  expect((await service.getInsights(payload)).source).toBe('random_forest_prototype');
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/ai\/recommend$/);
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual(payload);
});

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

it.each(['connection', 'body'])('keeps proof verification active and bounds a stalled %s at 45 seconds', async phase => {
  vi.useFakeTimers();
  vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('synthetic proof'));
  vi.stubGlobal('fetch', vi.fn((_url, { signal }) => {
    const stalled = () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError'))));
    return phase === 'connection' ? stalled() : Promise.resolve({ ok: true, json: stalled });
  }));
  const pending = service.verifyIdDocument({ path: '/unused/proof', mimetype: 'image/png', originalname: 'proof.png' }, { studentId: 'TEST-123', course: 'Test College' });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(/\/ocr\/verify$/);
  expect(options.body.get('student_id')).toBe('TEST-123');
  expect(options.body.get('course')).toBe('Test College');
  await vi.advanceTimersByTimeAsync(15000);
  expect(options.signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(30000);
  expect(await pending).toEqual({ verified: false, reason: 'Automatic verification timed out.' });
  expect(vi.getTimerCount()).toBe(0);
});
it('posts only daily aggregate history to Prophet and report aggregates to analysis',async()=>{
 const mock=vi.fn().mockResolvedValue({ok:true,json:async()=>({})});vi.stubGlobal('fetch',mock);
 const history={history:[{date:'2026-10-01',volume:0}],today:'2026-10-18',timezone:'Asia/Manila'};
 await service.getForecast(history);
 expect(mock.mock.calls[0][0]).toMatch(/\/forecast$/);
 expect(mock.mock.calls[0][1].method).toBe('POST');
 expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual(history);
 await service.getDocumentAnalytics({stages:[]});
 expect(mock.mock.calls[1][0]).toMatch(/\/ai\/document-analytics$/);
 expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({stages:[]});
});
