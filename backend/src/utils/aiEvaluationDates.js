const DAY = 86400000;
const manilaDate = (now = new Date()) => new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const midnightEpoch = date => Date.parse(`${date}T00:00:00+08:00`) / 1000;

function dailySeries(rows, start, end) {
  const counts = new Map(rows.map(row => [shiftDate('1970-01-01', Number(row.day_number)), Number(row.volume)]));
  const series = [];
  for (let date = start; date <= end; date = shiftDate(date, 1)) series.push({ date, volume: counts.get(date) || 0 });
  return series;
}

module.exports = { manilaDate, shiftDate, midnightEpoch, dailySeries };
