const model = require('../models/aiEvaluation.model');
const engine = require('./aiEngine.service');
const { forbidden, badRequest } = require('../utils/AppError');
const { manilaDate, shiftDate, midnightEpoch, dailySeries } = require('../utils/aiEvaluationDates');
const { fallback, validModel } = require('../utils/volumeForecast');
const { metrics } = require('../utils/forecastEvaluation');
function score(actual, forecast) {
  const result = metrics(actual.map((row, i) => ({ actual: row.volume, predicted: forecast[i].predicted_volume })), 'predicted');
  return { mae: result.mae, rmse: result.rmse, wape: result.wape_percent };
}

const dateFromEpoch = value => value == null ? null : manilaDate(new Date(Number(value) * 1000));
function normalise(row) {
  return { total: Number(row.total), synthetic: Number(row.synthetic), unmarked: Number(row.total) - Number(row.synthetic),
    ocr_measurement_method: require('../utils/ocrFieldDetection').METHOD,
    first_date: dateFromEpoch(row.first_epoch), last_date: dateFromEpoch(row.last_epoch),
    ocr_samples: Number(row.ocr_samples), ocr_field_detection: row.ocr_field_detection == null ? null : Number(row.ocr_field_detection),
    ocr_unverified_samples: Number(row.ocr_unverified_samples || 0), ocr_synthetic_samples: Number(row.ocr_synthetic_samples || 0),
    ocr_total_scored: Number(row.ocr_total_scored || 0) };
}

/** Incoming documents, including rejected/cancelled requests, counted once per document row. */
async function historyThrough(end, cohort) {
  const summary = normalise(await model.summary(cohort));
  const start = summary.first_date && summary.first_date > shiftDate(end, -89) ? summary.first_date : shiftDate(end, -89);
  const rows = start <= end ? await model.daily(midnightEpoch(start), midnightEpoch(shiftDate(end, 1)), cohort) : [];
  return { summary, start, end, rows, history: start <= end ? dailySeries(rows, start, end) : [] };
}

async function evaluate(user, query = {}) {
  if (user?.role !== 'admin') throw forbidden('Admin role required.');
  const today = manilaDate();
  const end = query.endDate || shiftDate(today, -1);
  if (typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(`${end}T00:00:00Z`)) ||
      new Date(`${end}T00:00:00Z`).toISOString().slice(0, 10) !== end || end >= today || end < '1970-01-01') {
    throw badRequest('Choose a valid completed Manila day for the evaluation end date.');
  }
  const cohort = query.cohort || 'all';
  if (!['all', 'synthetic', 'unmarked'].includes(cohort)) throw badRequest('Unknown dataset cohort.');
  const [overall, logs, training, randomForest] = await Promise.all([
    model.summary('all').then(normalise), model.logCounts(), historyThrough(shiftDate(end, -8), cohort),
    require('./stageRisk.service').analyse(require('../utils/documentInsights').snapshot([], 0)),
  ]);
  const testStart = shiftDate(end, -6);
  const testRows = await model.daily(midnightEpoch(testStart), midnightEpoch(shiftDate(end, 1)), cohort);
  const actual = dailySeries(testRows, testStart, end);
  const eligible = training.history.length >= 28 && training.history.some(row => row.volume > 0) && actual.some(row => row.volume > 0);
  const payload = { history: training.history, today: shiftDate(end, -7), timezone: 'Asia/Manila' };
  const baseline = eligible ? fallback(payload).forecast : [];
  const result = eligible ? await engine.getForecast(payload) : null;
  const prophet = validModel(result, payload) ? result.forecast : null;
  const baselineMetrics = eligible ? score(actual, baseline) : null;
  const prophetMetrics = prophet ? score(actual, prophet) : null;
  return { generated_at: new Date().toISOString(), dataset: overall, selected_dataset: training.summary, logs, random_forest: randomForest,
    live_window: { start: shiftDate(today, -90), end: shiftDate(today, -1) },
    evaluation: { cohort, end_date: end, train_start: training.history.length ? training.start : null, train_end: training.end,
      train_days: training.history.length, train_requests: training.history.reduce((sum, row) => sum + row.volume, 0),
      simulated_today: shiftDate(end, -7), test_start: testStart, test_end: end, test_requests: actual.reduce((sum, row) => sum + row.volume, 0),
      synthetic_requests: [...training.rows, ...testRows].reduce((sum, row) => sum + Number(row.synthetic), 0),
      status: !eligible ? 'insufficient_data' : prophet ? 'evaluated' : 'prophet_unavailable',
      baseline: baselineMetrics, prophet: prophetMetrics,
      improvement_percent: prophetMetrics && baselineMetrics.mae > 0 ? (baselineMetrics.mae - prophetMetrics.mae) / baselineMetrics.mae * 100 : null,
      daily: actual.map((row, i) => ({ date: row.date, actual: row.volume, baseline: baseline[i]?.predicted_volume ?? null, prophet: prophet?.[i]?.predicted_volume ?? null })) } };
}

module.exports = { evaluate };
