/** Presentation-only formatting helpers shared across dashboards. */

/** Today as "August 24, 2026", for the dashboard headers. */
export function todayLongDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Human-readable file size, e.g. 2048 → "2 KB". */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** "3 mins ago" / "2 hrs ago" / "4 days ago". */
export function getRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''} ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 1440)} day${Math.floor(diff / 1440) > 1 ? 's' : ''} ago`;
}

/** Elapsed wait time without the "ago" suffix, for queue tables. */
export function getWaitTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''}`;
  return `${Math.floor(diff / 60)} hr${Math.floor(diff / 60) > 1 ? 's' : ''}`;
}

/** Minutes → a readable duration, since a desk can hold a document for days. */
export function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}
