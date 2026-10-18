const model = require('../ocrMetrics.model');
it('keeps empty measurement distinct from zero and returns exclusion counts', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ ocr_field_detection: null, ocr_samples: 0,
    ocr_unverified_samples: 2, ocr_synthetic_samples: 0, ocr_total_scored: 2 }]]) };
  expect(await model.summary(executor)).toEqual({ method: 'intake_fields_v1', score: null, samples: 0,
    unverified_samples: 2, synthetic_samples: 0, total_scored: 2 });
  const sql = executor.query.mock.calls[0][0];
  expect(sql).toContain("field_detection.method");
  expect(sql).toContain('ABS(ocr_confidence_score-100.0*');
  expect(sql).toContain("tracking_number LIKE 'TRC-MOCK-%'");
});
it('preserves a measured zero rather than changing it to missing data', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ ocr_field_detection: '0.0000', ocr_samples: 1,
    ocr_unverified_samples: 2, ocr_synthetic_samples: 1, ocr_total_scored: 4 }]]) };
  expect(await model.summary(executor)).toMatchObject({ score: 0, samples: 1, unverified_samples: 2, synthetic_samples: 1 });
});
