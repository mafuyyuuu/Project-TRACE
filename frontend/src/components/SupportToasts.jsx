import { createPortal } from 'react-dom';
import Button from '@/components/Button';
import useNotificationDismissal from '@/hooks/useNotificationDismissal';
export default function SupportToasts({ notices, onDismiss, onDismissAll }) {
  useNotificationDismissal(onDismissAll);
  if (!notices.length) return null;
  return createPortal(<aside aria-label="Support action notifications" className="pointer-events-none fixed bottom-4 left-4 right-4 z-[120] flex max-h-[40dvh] flex-col gap-2 overflow-y-auto sm:left-auto sm:w-96">
    {notices.map(row => <div key={row.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-green-200 bg-white p-4 text-green-950 shadow-lg dark:border-green-800 dark:bg-gray-900 dark:text-green-100">
      <p role="status" aria-live="polite" className="min-w-0 flex-1 break-words text-sm">{row.message}</p>
      <Button type="button" aria-label={`Dismiss ${row.message}`} onClick={() => onDismiss(row.id)} className="trace-icon-button">✕</Button>
    </div>)}
  </aside>, document.body);
}
