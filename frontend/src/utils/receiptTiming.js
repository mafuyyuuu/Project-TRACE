export function receiptWait(value, now = Date.now(), label = 'OR') {
  if (!value) return 'Clearance time not recorded';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Clearance time not recorded';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), remainder = minutes % 60;
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${remainder}m waiting for ${label}`;
}

const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
export function receiptWindow(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const afterCutoff = Number(parts.hour) >= 16;
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + (afterCutoff ? 1 : 0));
  return { today, afterCutoff, earliestDate: next.toISOString().slice(0, 10) };
}
