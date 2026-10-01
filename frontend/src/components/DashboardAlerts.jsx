import { useId, useRef } from 'react';
import ModalShell from '@/components/ModalShell';
import useNotificationDismissal from '@/hooks/useNotificationDismissal';

/**
 * Acknowledgment dialog for dashboard feedback. Each feature owns the
 * messages and clears them via onDismiss; feedback never expires on a timer.
 * A separate shell layer keeps it above the form or confirmation that caused
 * it, and dismissing it returns focus to that still-open dialog.
 */
export default function DashboardAlerts({ success, error, onDismiss, dismissalKey }) {
  useNotificationDismissal(onDismiss, dismissalKey);
  const acknowledgeRef = useRef(null);
  const descriptionId = useId();

  return (
    <ModalShell
      open={!!(success || error)}
      onClose={onDismiss}
      title={error ? 'Attention Needed' : 'Success'}
      maxWidth="max-w-md"
      layer="feedback"
      showCloseButton={false}
      initialFocusRef={acknowledgeRef}
      descriptionId={descriptionId}
      footer={
        <button
          ref={acknowledgeRef}
          type="button"
          onClick={onDismiss}
          className="w-full px-5 py-3 rounded-2xl text-xs font-bold text-white bg-[#15803d] hover:bg-[#166534] transition-colors"
        >
          OK
        </button>
      }
    >
      <div id={descriptionId} className="space-y-3 text-sm leading-relaxed break-words select-text">
        {success && <p role="status" className="text-gray-700 dark:text-gray-300">{success}</p>}
        {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
      </div>
    </ModalShell>
  );
}
