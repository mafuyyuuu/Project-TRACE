const number = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });
const period = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });

const recordedNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function supportMetricNumber(value) {
  return recordedNumber(value) ? number.format(Number(value)) : 'No data';
}

// Empty recorded groups total zero; absent values never become a made-up zero.
export function supportMetricTotal(values) {
  return values.every(recordedNumber) ? values.reduce((sum, value) => sum + Number(value), 0) : null;
}

export function supportPeriodTime(value) {
  const time = value ? new Date(value) : null;
  return time && Number.isFinite(time.getTime()) ? period.format(time) : 'No data';
}
