const DAY = 86400000;
const FIRST_DELAY_MS = 3 * DAY;
const REPEAT_MS = 7 * DAY;

function reminderPeriod(readyAt, now) {
  if (!Number.isSafeInteger(readyAt) || !Number.isSafeInteger(now) || readyAt <= 0 || now < readyAt + FIRST_DELAY_MS) return null;
  const period = Math.floor((now - readyAt - FIRST_DELAY_MS) / REPEAT_MS);
  return { period, dueAt: readyAt + FIRST_DELAY_MS + period * REPEAT_MS };
}

module.exports = { FIRST_DELAY_MS, REPEAT_MS, reminderPeriod };
