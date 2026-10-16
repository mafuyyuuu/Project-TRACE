/** Preserve a readable stage width as both the panel and user typography change. */
export function trackingColumns(width, rootFontSize = 16) {
  const stageWidth = 120 * Math.max(1, rootFontSize / 16);
  return [9, 3, 2, 1].find(count => width >= count * stageWidth) || 1;
}

/** A row turn goes around labels rather than through their text. */
export function trackingConnector(point, next, index, columns, width) {
  const gap = 2;
  if (Math.floor(index / columns) === Math.floor((index + 1) / columns)) {
    const direction = next.x > point.x ? 1 : -1;
    return `M ${point.x + direction * (point.radius + gap)} ${point.y} H ${next.x - direction * (next.radius + gap)}`;
  }
  const right = Math.floor(index / columns) % 2 === 0;
  const edge = right ? width - 2 : 2;
  const direction = right ? 1 : -1;
  return `M ${point.x + direction * (point.radius + gap)} ${point.y} H ${edge} V ${next.y} H ${next.x + direction * (next.radius + gap)}`;
}

/** Latest actual entry into a repeated stage; absent history stays absent. */
export function trackingStageTime(document, status, firstStage) {
  const timestamps = (document.step_logs || []).filter(row => row.to_status === status)
    .map(row => [row.timestamp_started, row.timestamp_completed].find(value => value && Number.isFinite(new Date(value).getTime())))
    .filter(value => value && Number.isFinite(new Date(value).getTime()));
  const first = status === firstStage && document.created_at && Number.isFinite(new Date(document.created_at).getTime()) ? document.created_at : null;
  return timestamps.sort((a, b) => new Date(b) - new Date(a))[0] || first;
}
