const { snapshot, buildInsights, prototypePrediction } = require('../documentInsights');
const { PIPELINE } = require('../documentStatus');

it('includes every active stage and separates terminal and unclassified records', () => {
  const data = snapshot([...PIPELINE.map(current_status => ({ current_status, count: 2 })), { current_status: 'APPROVED', count: 3 }, { current_status: 'REJECTED', count: 4 }, { current_status: null, count: 7 }], 30);
  const result = buildInsights(data);
  expect(result[0].evidence).toMatchObject({ outstanding: 16, unclassified: 7, today_actions: 30 });
  expect(Object.values(data.counts)).toEqual(Array(8).fill(2));
  expect(result.find(row => row.title === 'Document statuses need review')).toBeDefined();
  expect(JSON.stringify(result)).not.toMatch(/Optimal Performance|operating efficiently|higher than average|mock_data_gen/i);
});

it('does not turn quiet evaluation/release queues into an efficiency claim', () => {
  const data = snapshot([{ current_status: 'SEC_PROCESSING', count: 60 }], 1000);
  const result = buildInsights(data, 0);
  expect(result).toHaveLength(1);
  expect(result[0].message).toContain('Secretary Processing: 60');
  expect(result[0].message).toContain('actions are not distinct requests');
});

it('uses thresholds only as queue-review signals and labels the prototype limitations', () => {
  const result = buildInsights(snapshot([{ current_status: 'PENDING_SEC_EVALUATION', count: 6 }, { current_status: 'READY_FOR_RELEASE', count: 4 }], 50), 3);
  expect(result.find(row => row.title === 'Secretary Queue Alert').message).toContain('does not prove a bottleneck');
  expect(result.find(row => row.title === 'Release Desk Advisory').message).toContain('does not prove Window 1 is overloaded');
  expect(result.find(row => row.method === 'random_forest_prototype').message).toContain('four coded examples');
  expect(buildInsights(snapshot([], 50), 3).some(row => row.method === 'random_forest_prototype')).toBe(false);
  expect(buildInsights(snapshot([{ current_status: 'SEC_PROCESSING', count: 6 }], 50), 1).some(row => row.method === 'random_forest_prototype')).toBe(false);
});

it.each([null, { source: 'random_forest' }, { source: 'random_forest_prototype', training_samples: 4, validated: true, prediction: 1 }, { source: 'random_forest_prototype', training_samples: 4, validated: false, prediction: '1' }])('rejects an unsupported model contract', response => {
  expect(prototypePrediction(response)).toBeNull();
});

it('accepts only an explicitly unvalidated prototype classification', () => {
  expect(prototypePrediction({ source: 'random_forest_prototype', training_samples: 4, validated: false, prediction: 1 })).toBe(1);
});

it.each([-1, NaN, 1.5])('rejects an invalid observed count instead of reporting zero', value => {
  expect(() => snapshot([{ current_status: 'SEC_PROCESSING', count: value }], 0)).toThrow('Invalid document queue count');
});
