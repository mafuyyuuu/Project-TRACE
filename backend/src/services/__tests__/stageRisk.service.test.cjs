const service = require('../stageRisk.service');
const model = require('../../models/stageRisk.model');
const engine = require('../aiEngine.service');
const { snapshot, buildInsights } = require('../../utils/documentInsights');
const { STATUS } = require('../../utils/documentStatus');
const now = new Date('2026-10-18T06:00:00Z');
const epoch = now.getTime() / 1000;
const metric = { samples: 10, documents: 5, accuracy: 0.8, precision: 0.8, recall: 0.8, f1: 0.8, baseline_accuracy: 0.5, positives: 5, negatives: 5, confusion_matrix: [[4, 1], [1, 4]] };
const report = () => ({ status: 'ready', version: 'stage_wait_rf_v1', model_id: '0123456789abcdef', horizon_hours: 24,
  real_world_validated: false, training: { simulated_documents: 2000, recorded_documents: 1, marked_synthetic_documents: 0, unmarked_unverified_documents: 1, samples: 6735, overlapping_intervals_excluded: 0 },
  evaluation: { simulation: metric, recorded: null, marked_synthetic: null, unmarked_unverified: null },
  out_of_range_cases: 0, predictions: [{ stage: STATUS.SEC_PROCESSING, age_hours: 12, probability: 0.7 }] });
const data = () => snapshot([{ current_status: STATUS.SEC_PROCESSING, count: 4 }], 20, now);
beforeEach(() => {
  vi.spyOn(model, 'intervals').mockResolvedValue([
    { document_id: 914, stage: STATUS.SEC_PROCESSING, next_stage: STATUS.PENDING_STUDENT_PAYMENT, entered: epoch - 3 * 86400, exited: epoch - 86400, origin: 'unmarked_unverified' },
    { document_id: 915, stage: 'PROCESSING', next_stage: 'APPROVED', entered: epoch - 3 * 86400, exited: epoch - 86400, origin: 'marked_synthetic' },
    { document_id: 916, stage: STATUS.SEC_PROCESSING, next_stage: STATUS.COMPLETED, entered: epoch - 3 * 86400, exited: epoch - 86400, origin: 'marked_synthetic' },
  ]);
  vi.spyOn(model, 'oldestCases').mockResolvedValue([{ stage: STATUS.SEC_PROCESSING, entered: epoch - 12 * 3600 }]);
  vi.spyOn(engine, 'getInsights').mockResolvedValue({ source: 'random_forest_experimental', random_forest: report() });
});
it('uses eligible current history, groups it without identities and counts exclusions', async () => {
  const result = await service.analyse(data());
  expect(result.data).toMatchObject({ candidate_intervals: 3, eligible_intervals: 1, excluded_intervals: 2 });
  const payload = engine.getInsights.mock.calls[0][0];
  expect(payload.training_intervals).toEqual([{ group: 0, stage: STATUS.SEC_PROCESSING, entered: epoch - 3 * 86400, exited: epoch - 86400, origin: 'unmarked_unverified' }]);
  expect(JSON.stringify(payload)).not.toContain('914');
  expect(payload.active_cases).toEqual([{ stage: STATUS.SEC_PROCESSING, entered: epoch - 12 * 3600 }]);
  expect(result.predictions).toHaveLength(1);
  const cards = buildInsights(data(), null, result);
  const learned = cards.find(row => row.method === 'random_forest_experimental');
  expect(learned.message).toContain('24 hours in this stage: 70%');
  expect(cards[0]).toBe(learned);
  expect(learned.message).toContain('not accuracy');
  expect(learned.message).toContain('actual pages and final price');
  expect(cards.filter(row => row.method === 'queue_rules').some(row => row.title.includes('Secretary Processing'))).toBe(false);
});
it('keeps measured queue advice when the model or data read fails', async () => {
  engine.getInsights.mockResolvedValue(null);
  expect(await service.analyse(data())).toEqual({ status: 'unavailable' });
  const cards = buildInsights(data(), null, { status: 'unavailable' });
  expect(cards.find(row => row.title === 'Random Forest unavailable').message).toContain('workflow rules');
  expect(cards.some(row => row.method === 'random_forest_experimental')).toBe(false);
  model.intervals.mockRejectedValue(new Error('offline'));
  expect(await service.analyse(data())).toEqual({ status: 'unavailable' });
});
it.each([
  value => { value.real_world_validated = true; },
  value => { value.evaluation.simulation = { ...metric, accuracy: 95 }; },
  value => { value.predictions[0].probability = NaN; },
  value => { value.predictions.push({ ...value.predictions[0] }); },
  value => { value.training.recorded_documents = 2; },
])('rejects invented provenance or malformed model evidence', async mutate => {
  const value = report(); mutate(value);
  engine.getInsights.mockResolvedValue({ source: 'random_forest_experimental', random_forest: value });
  expect(await service.analyse(data())).toEqual({ status: 'unavailable' });
});
it('rejects a prediction attached to a different observed waiting age', async () => {
  const value = report(); value.predictions[0].age_hours = 13;
  engine.getInsights.mockResolvedValue({ source: 'random_forest_experimental', random_forest: value });
  expect((await service.analyse(data())).predictions).toEqual([]);
});
