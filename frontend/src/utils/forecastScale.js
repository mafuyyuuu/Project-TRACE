/** One scale for all filters and both views of the same seven-day forecast. */
export function forecastCeiling(data = []) {
  const maximum = Math.max(0, ...data.map(row => Number(row.predicted_volume)).filter(Number.isFinite));
  return Math.ceil(Math.max(5, maximum * 1.2) / 5) * 5;
}
