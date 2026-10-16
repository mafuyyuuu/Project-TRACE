const { PIPELINE, LEGACY_STATUS, STAGE_LABELS } = require('./documentStatus');
const ACTIVE_STAGES = PIPELINE.slice(0, -1);
const TERMINAL = new Set([PIPELINE.at(-1), ...Object.values(LEGACY_STATUS)]);

function count(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('Invalid document queue count.');
  return number;
}

function snapshot(rows, todayActions, now = new Date()) {
  const counts = Object.fromEntries(ACTIVE_STAGES.map(stage => [stage, 0]));
  let unclassified = 0;
  for (const row of rows) {
    const stage = String(row.current_status || '').toUpperCase();
    const value = count(row.count);
    if (Object.hasOwn(counts, stage)) counts[stage] += value;
    else if (!TERMINAL.has(stage)) unclassified += value;
  }
  return { counts, unclassified, today_actions: count(todayActions), as_of: now.toISOString() };
}

// A legacy engine response must never reintroduce unsupported "optimal" claims.
function prototypePrediction(response) {
  return response?.source === 'random_forest_prototype' && response.validated === false &&
    response.training_samples === 4 && Number.isInteger(response.prediction) &&
    response.prediction >= 0 && response.prediction <= 3 ? response.prediction : null;
}

function buildInsights(data, prediction = null) {
  const entries = ACTIVE_STAGES.map(stage => [stage, count(data.counts[stage])]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const evidence = { counts: data.counts, outstanding: total, unclassified: data.unclassified, today_actions: data.today_actions };
  const add = (title, message, type = 'info', method = 'queue_snapshot') => ({ type, title, message, method, as_of: data.as_of, evidence });
  const breakdown = entries.filter(([, value]) => value).map(([stage, value]) => `${STAGE_LABELS[stage]}: ${value}`).join('; ');
  const insights = [add(total ? `Document workload: ${total} outstanding` : 'Document workload: no active pipeline documents',
    `${breakdown || 'All active pipeline queues are empty.'} ${data.today_actions} workflow actions recorded today (Manila); actions are not distinct requests. Queue size alone does not establish efficiency, delays or staffing capacity. Review measured durations in Efficiency Analytics.`)];
  if (data.unclassified) insights.push(add('Document statuses need review',
    `${data.unclassified} documents have an unrecognized status and are excluded from the active-pipeline total. Review their status mapping before interpreting workload.`, 'warning'));
  if (data.counts.PENDING_SEC_EVALUATION > 5) insights.push(add('Secretary Queue Alert',
    `${data.counts.PENDING_SEC_EVALUATION} documents await evaluation, exceeding the current advisory count threshold of 5. Review assignments and recorded waits; this threshold does not prove a bottleneck.`, 'warning'));
  if (data.counts.READY_FOR_RELEASE > 3) insights.push(add('Release Desk Advisory',
    `${data.counts.READY_FOR_RELEASE} documents await pickup, exceeding the current advisory count threshold of 3. Review pickup coordination; this count does not prove Window 1 is overloaded.`));
  const relevant = prediction === 3 || prediction === 1 && data.counts.PENDING_SEC_EVALUATION > 0 || prediction === 2 && data.counts.READY_FOR_RELEASE > 0;
  if (prediction && total && relevant) {
    const area = { 1: 'Secretary evaluation', 2: 'release coordination', 3: 'document workload' }[prediction];
    insights.push(add('Experimental model advisory',
      `The prototype suggests reviewing ${area}. Random Forest uses evaluation count, release count and today's workflow actions, trained on four coded examples. It does not cover every stage and has no validated delay or staffing accuracy. Check the complete queue snapshot and measured waits before acting.`, 'info', 'random_forest_prototype'));
  }
  return insights;
}

module.exports = { ACTIVE_STAGES, snapshot, buildInsights, prototypePrediction };
