export default function UnreadIndicator({ count }) {
  return Number(count) > 0 ? <span role="img" aria-label={`${count} unread messages`} title={`${count} unread messages`} className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" /> : null;
}
