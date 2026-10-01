export const TEXT_SIZES = [100, 125, 150, 200];
export const TEXT_SIZE_KEY = 'trace_text_size';

export function normalizeTextSize(value) {
  const size = Number(value);
  return TEXT_SIZES.includes(size) ? size : 100;
}

export function readTextSize() {
  try { return normalizeTextSize(localStorage.getItem(TEXT_SIZE_KEY)); }
  catch { return 100; }
}

export function applyTextSize(value) {
  const size = normalizeTextSize(value);
  document.documentElement.style.fontSize = `${size}%`;
  document.documentElement.dataset.traceTextSize = String(size);
  return size;
}

export function saveTextSize(value) {
  const size = applyTextSize(value);
  try { localStorage.setItem(TEXT_SIZE_KEY, String(size)); }
  catch { /* The setting still applies when browser storage is blocked. */ }
  return size;
}
