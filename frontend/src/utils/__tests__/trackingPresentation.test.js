import { expect, it } from 'vitest';
import { trackingColumns, trackingConnector, trackingStageTime } from '@/utils/trackingPresentation';

it.each([[1100, 16, 9], [864, 16, 3], [270, 16, 2], [220, 16, 1], [1100, 32, 3], [270, 32, 1]])('keeps labels readable at %s px and %s px text', (width, font, expected) => {
  expect(trackingColumns(width, font)).toBe(expected);
});
it('joins circles at their measured radii and routes row turns outside the label columns', () => {
  const a = { x: 100, y: 16, radius: 16 }, b = { x: 200, y: 16, radius: 16 };
  expect(trackingConnector(a, b, 0, 3, 300)).toBe('M 118 16 H 182');
  expect(trackingConnector(b, a, 3, 3, 300)).toBe('M 182 16 H 118');
  expect(trackingConnector(b, { ...b, y: 180 }, 2, 3, 300)).toBe('M 218 16 H 298 V 180 H 218');
});
it('uses the latest saved stage entry, keeps unknown dates absent, and never treats a creation date as another stage date', () => {
  const document = { created_at: '2026-10-01T00:00:00Z', step_logs: [
    { to_status: 'PROCESSING', timestamp_started: '2026-10-02T00:00:00Z' },
    { to_status: 'PROCESSING', timestamp_started: '2026-10-03T00:00:00Z' },
  ] };
  expect(trackingStageTime(document, 'PROCESSING', 'INTAKE')).toBe('2026-10-03T00:00:00Z');
  expect(trackingStageTime(document, 'INTAKE', 'INTAKE')).toBe(document.created_at);
  expect(trackingStageTime(document, 'COMPLETED', 'INTAKE')).toBeNull();
  expect(trackingStageTime({ created_at: 'bad' }, 'INTAKE', 'INTAKE')).toBeNull();
});
