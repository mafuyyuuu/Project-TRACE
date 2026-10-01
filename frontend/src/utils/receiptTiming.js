export function receiptWait(value, now = Date.now()) {
  if (!value) return 'Clearance time not recorded';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Clearance time not recorded';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), remainder = minutes % 60;
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${remainder}m waiting for OR`;
}
