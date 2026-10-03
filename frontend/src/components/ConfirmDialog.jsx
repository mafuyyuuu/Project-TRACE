import { useId, useRef } from 'react';
import ModalShell from '@/components/ModalShell';

/**
 * Replaces window.confirm() with an in-app dialog. Backdrop/Esc/close-button
 * dismissal are all suppressed while `loading` is true, so an in-flight
 * action can't be dismissed out from under itself.
 */
export default function ConfirmDialog({
  open,
  children,
  maxWidth = 'max-w-md',
  title,
  message,
  variant = 'neutral',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  loadingLabel = 'Working…',
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);
  const descriptionId = useId();
  const lines = Array.isArray(message) ? message.filter(Boolean) : [message];

  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth={maxWidth}
      closeOnBackdrop={!loading}
      closeOnEsc={!loading}
      showCloseButton={!loading}
      initialFocusRef={cancelButtonRef}
      descriptionId={descriptionId}
      busy={loading}
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={loading}
            className="trace-button trace-button-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`trace-button flex-1 ${
              variant === 'destructive' ? 'trace-button-danger' : 'trace-button-primary'
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      }
    >
      <div id={descriptionId}>
        {lines.map((line, i) => (
        <p
          key={i}
          className={i === 0 ? 'text-sm text-gray-600 dark:text-gray-300 leading-relaxed' : 'text-xs text-gray-500 dark:text-gray-400 font-medium mt-2 leading-relaxed'}
        >
          {line}
        </p>
        ))}
        {children}
      </div>
    </ModalShell>
  );
}
