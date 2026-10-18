const model = require('../models/stageRisk.model');
const engine = require('./aiEngine.service');
const { ACTIVE_STAGES } = require('../utils/documentInsights');
const { TRANSITIONS } = require('../utils/documentStatus');

const RATE_FIELDS = ['accuracy', 'precision', 'recall', 'f1', 'baseline_accuracy'];
const rate = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const integer = value => Number.isSafeInteger(value) && value >= 0;
function validMetric(value) {
  return value === null || value && RATE_FIELDS.every(key => rate(value[key])) &&
    ['samples', 'documents', 'positives', 'negatives'].every(key => integer(value[key])) &&
    value.samples > 0 && value.documents > 0 && value.positives + value.negatives === value.samples &&
    Array.isArray(value.confusion_matrix) && value.confusion_matrix.length === 2 &&
    value.confusion_matrix.every(row => Array.isArray(row) && row.length === 2 && row.every(integer)) &&
    value.confusion_matrix.flat().reduce((a, b) => a + b, 0) === value.samples;
}
function validReport(value) {
  return value?.status === 'ready' && value.version === 'stage_wait_rf_v1' && value.real_world_validated === false &&
    value.horizon_hours === 24 && typeof value.model_id === 'string' && /^[a-f0-9]{16}$/.test(value.model_id) &&
    ['simulated_documents', 'recorded_documents', 'marked_synthetic_documents', 'unmarked_unverified_documents', 'samples', 'overlapping_intervals_excluded'].every(key => integer(value.training?.[key])) &&
    value.training.simulated_documents === 2000 && value.training.samples > 0 &&
    value.training.marked_synthetic_documents + value.training.unmarked_unverified_documents === value.training.recorded_documents &&
    value.evaluation?.simulation && ['simulation', 'recorded', 'marked_synthetic', 'unmarked_unverified'].every(key => validMetric(value.evaluation[key])) &&
    integer(value.out_of_range_cases) && Array.isArray(value.predictions) && value.predictions.length <= 8 &&
    new Set(value.predictions.map(row => row.stage)).size === value.predictions.length &&
    value.predictions.every(row => ACTIVE_STAGES.includes(row.stage) && rate(row.probability) && typeof row.age_hours === 'number' && Number.isFinite(row.age_hours) && row.age_hours >= 0 && row.age_hours <= 168);
}

async function analyse(snapshot) {
  try {
    const now = Date.parse(snapshot.as_of) / 1000;
    const [rows, active] = await Promise.all([model.intervals(now), model.oldestCases(now)]);
    const groups = new Map();
    const seen = new Set();
    let excluded = 0;
    const intervals = [];
    for (const row of rows) {
      const entered = Number(row.entered), exited = Number(row.exited);
      const key = `${row.document_id}:${row.stage}:${entered}:${exited}`;
      if (!ACTIVE_STAGES.includes(row.stage) || !TRANSITIONS[row.stage]?.includes(row.next_stage) ||
          !['marked_synthetic', 'unmarked_unverified'].includes(row.origin) ||
          !Number.isFinite(entered) || !Number.isFinite(exited) || entered <= 0 || exited <= entered || exited > now || exited - entered > 720 * 3600 || seen.has(key)) {
        excluded++; continue;
      }
      seen.add(key);
      if (!groups.has(row.document_id)) groups.set(row.document_id, groups.size);
      intervals.push({ group: groups.get(row.document_id), stage: row.stage, entered, exited, origin: row.origin });
    }
    const cases = active.filter(row => ACTIVE_STAGES.includes(row.stage) && snapshot.counts[row.stage] > 0 &&
      Number.isFinite(Number(row.entered)) && Number(row.entered) > 0 && Number(row.entered) <= now)
      .map(row => ({ stage: row.stage, entered: Number(row.entered) }));
    const response = await engine.getInsights({ ...snapshot, training_intervals: intervals, active_cases: cases });
    const result = response?.source === 'random_forest_experimental' ? response.random_forest : null;
    if (!validReport(result)) return { status: 'unavailable' };
    // Do not accept a stage prediction for a case absent from this snapshot.
    const reported = result.predictions.filter(row => cases.some(item => item.stage === row.stage &&
      Math.abs((now - item.entered) / 3600 - row.age_hours) <= 0.011));
    return { ...result, predictions: reported, data: { candidate_intervals: rows.length, eligible_intervals: intervals.length,
      excluded_intervals: excluded, interval_limit: 3000, active_stages_with_entry: cases.length,
      as_of: snapshot.as_of } };
  } catch {
    return { status: 'unavailable' };
  }
}

module.exports = { analyse, validReport };
