const service = require('../aiEvaluation.service');
const model = require('../../models/aiEvaluation.model');
const engine = require('../aiEngine.service');
const { midnightEpoch, shiftDate } = require('../../utils/aiEvaluationDates');
const { fallback } = require('../../utils/volumeForecast');
const ADMIN = { role: 'admin' };
const row = date => ({ day_number: Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000), volume: 7, synthetic: 7 });
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-17T17:00:00Z'));
  vi.spyOn(model, 'summary').mockResolvedValue({ total: '10043', synthetic: '10000', first_epoch: midnightEpoch('2020-01-01'), last_epoch: midnightEpoch('2026-10-17'), ocr_samples: '2', ocr_field_detection: '66.67' });
  vi.spyOn(model, 'logCounts').mockResolvedValue({ activity_events: 30129, displayed_activity_limit: 100 });
  vi.spyOn(model, 'daily').mockImplementation(async (start, end) => {
    const rows = [];
    for (let epoch = start; epoch < end; epoch += 86400) rows.push(row(new Date((epoch + 28800) * 1000).toISOString().slice(0, 10)));
    return rows;
  });
  vi.spyOn(engine, 'getForecast').mockImplementation(async payload => ({ source: 'prophet', forecast: fallback(payload).forecast.map(row => ({ ...row, predicted_volume: 9 })) }));
});
afterEach(() => vi.useRealTimers());

it('enforces admin authorization before any data query', async () => {
  for (const user of [undefined, { role: 'student' }, { role: 'clerk' }]) await expect(service.evaluate(user)).rejects.toMatchObject({ status: 403 });
  expect(model.summary).not.toHaveBeenCalled();
});
it.each(['2026-02-30', 'garbage', '2026-10-18', '2027-01-01', ['2026-07-20']])('rejects malformed or incomplete end date %s', async endDate => {
  await expect(service.evaluate(ADMIN, { endDate })).rejects.toMatchObject({ status: 400 });
  expect(model.summary).not.toHaveBeenCalled();
});
it('keeps historical targets held out, scores exact dates and reconciles provenance', async () => {
  const result = await service.evaluate(ADMIN, { endDate: '2026-07-20', cohort: 'synthetic' });
  const payload = engine.getForecast.mock.calls[0][0];
  expect(payload.history).toHaveLength(90);
  expect(payload.history.at(-1).date).toBe('2026-07-12');
  expect(payload.today).toBe('2026-07-13');
  expect(fallback(payload).forecast.map(row => row.date)).toEqual(Array.from({ length: 7 }, (_, i) => shiftDate('2026-07-14', i)));
  expect(payload).not.toHaveProperty('actual');
  expect(result.dataset).toMatchObject({ total: 10043, synthetic: 10000, unmarked: 43, ocr_samples: 2 });
  expect(result.evaluation).toMatchObject({ status: 'evaluated', train_requests: 630, test_requests: 49, synthetic_requests: 679,
    baseline: { mae: 0, rmse: 0, wape: 0 }, prophet: { mae: 2, rmse: 2, wape: expect.closeTo(200 / 7, 10) }, improvement_percent: null });
  expect(model.daily).toHaveBeenCalledWith(midnightEpoch('2026-07-14'), midnightEpoch('2026-07-21'), 'synthetic');
});
it('scores an unavailable or misdated model only as an unmeasured Prophet result', async () => {
  engine.getForecast.mockResolvedValue({ source: 'prophet', forecast: [{ date: '2020-01-01', predicted_volume: 999 }] });
  const { evaluation } = await service.evaluate(ADMIN);
  expect(evaluation.status).toBe('prophet_unavailable');
  expect(evaluation.prophet).toBeNull(); expect(evaluation.baseline.mae).toBe(0);
});
it('does not manufacture evidence from an empty or too-short archive', async () => {
  model.summary.mockResolvedValue({ total: 0, synthetic: 0, first_epoch: null, last_epoch: null, ocr_samples: 0, ocr_field_detection: null });
  model.daily.mockResolvedValue([]);
  const result = await service.evaluate(ADMIN);
  expect(result.evaluation.status).toBe('insufficient_data'); expect(result.evaluation.prophet).toBeNull();
  expect(engine.getForecast).not.toHaveBeenCalled();
  model.summary.mockResolvedValue({ total: 1, synthetic: 0, first_epoch: midnightEpoch('2026-10-15'), last_epoch: midnightEpoch('2026-10-15'), ocr_samples: 0 });
  expect((await service.evaluate(ADMIN)).evaluation.train_days).toBe(0);
});
