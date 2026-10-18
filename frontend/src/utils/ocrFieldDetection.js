const count = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;

/** Older API averages have no current-method provenance and must remain unmeasured. */
export function ocrFieldDetection(measurement) {
  if (measurement?.method !== 'intake_fields_v1') return { score: null, samples: 0,
    unverified: count(measurement?.total_scored ?? measurement?.samples), synthetic: 0 };
  const samples = count(measurement.samples);
  const valid = samples > 0 && Number.isFinite(measurement.score) && measurement.score >= 0 && measurement.score <= 100;
  return { score: valid ? measurement.score : null, samples: valid ? samples : 0,
    unverified: count(measurement.unverified_samples) + (valid ? 0 : samples), synthetic: count(measurement.synthetic_samples) };
}

/** Preview only: three example scans with 1, 2 and 3 of the expected fields. */
export function demoOcrFieldDetection(metric) {
  const demoSamples = 3;
  const demoScoreTotal = (1 + 2 + 3) / 3 * 100;
  const samples = metric.samples + demoSamples;
  return { score: ((metric.score ?? 0) * metric.samples + demoScoreTotal) / samples, samples, demoSamples };
}
