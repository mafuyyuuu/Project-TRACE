const ZONE_OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const DEFAULTS = Object.freeze({ weekdays: [1, 2, 3, 4], open_minute: 480, close_minute: 960, closed_dates: [], warning_minutes: 3, timeout_minutes: 5 });
function manilaDay(value) {
  const date = new Date(new Date(value).getTime() + ZONE_OFFSET);
  return { date: date.toISOString().slice(0, 10), weekday: date.getUTCDay(), start: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - ZONE_OFFSET };
}
function windowFor(value, settings = DEFAULTS) {
  const day = manilaDay(value);
  const enabled = settings.weekdays.includes(day.weekday) && !settings.closed_dates.includes(day.date);
  return { ...day, enabled, opens: day.start + settings.open_minute * 60000, closes: day.start + settings.close_minute * 60000 };
}
function liveWindow(now = new Date(), settings = DEFAULTS) {
  const time = new Date(now).getTime();
  const day = windowFor(time, settings);
  const open = day.enabled && time >= day.opens && time < day.closes;
  let next = null;
  // Settings allow up to 366 exceptions; at least one weekday must remain enabled.
  for (let offset = 0; offset <= 740; offset++) {
    const candidate = windowFor(day.start + offset * DAY, settings);
    if (candidate.enabled && candidate.opens > time) { next = new Date(candidate.opens).toISOString(); break; }
  }
  return { open, timezone: 'Asia/Manila', next_opens_at: open ? null : next, closes_at: open ? new Date(day.closes).toISOString() : null };
}
function serviceMilliseconds(from, to, settings = DEFAULTS) {
  const start = new Date(from).getTime(), end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  let total = 0;
  for (let day = manilaDay(start).start; day < end; day += DAY) {
    const window = windowFor(day, settings);
    if (window.enabled) total += Math.max(0, Math.min(end, window.closes) - Math.max(start, window.opens));
  }
  return total;
}
function validateSettings(value) {
  const { badRequest } = require('./AppError');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('Enter valid support settings.');
  const days = value.weekdays;
  if (!Array.isArray(days) || !days.length || days.length > 7 || new Set(days).size !== days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw badRequest('Choose at least one distinct support weekday.');
  if (!Number.isInteger(value.open_minute) || !Number.isInteger(value.close_minute) || value.open_minute < 0 || value.close_minute > 1440 || value.open_minute >= value.close_minute) throw badRequest('Support opening time must precede closing time.');
  if (!Number.isInteger(value.warning_minutes) || !Number.isInteger(value.timeout_minutes) || value.warning_minutes < 1 || value.timeout_minutes > 60 || value.warning_minutes >= value.timeout_minutes) throw badRequest('Warning must be at least 1 minute and precede a timeout of at most 60 minutes.');
  if (!Array.isArray(value.closed_dates) || value.closed_dates.length > 366 || new Set(value.closed_dates).size !== value.closed_dates.length || value.closed_dates.some(date => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw badRequest('Enter up to 366 distinct valid closed dates (YYYY-MM-DD).');
  return { weekdays: [...days].sort(), open_minute: value.open_minute, close_minute: value.close_minute, closed_dates: [...value.closed_dates].sort(), warning_minutes: value.warning_minutes, timeout_minutes: value.timeout_minutes };
}
module.exports = { DEFAULTS, liveWindow, serviceMilliseconds, validateSettings };
