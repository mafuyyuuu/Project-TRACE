import { getRelativeTime } from '@/utils/formatters';
export default function AdminTimestamp({ value, seconds = false, relative = false }) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  const zone = { timeZone: 'Asia/Manila' };
  return <><span className="block text-trace-ink dark:text-gray-100">{date.toLocaleDateString('en-PH', { ...zone, month: 'short', day: 'numeric', year: 'numeric' })}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{relative ? getRelativeTime(value) : date.toLocaleTimeString('en-PH', { ...zone, hour: 'numeric', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) })}</span></>;
}
