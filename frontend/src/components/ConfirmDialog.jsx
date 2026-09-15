import { useRef } from 'react';
import ModalShell from '@/components/ModalShell';

/**
 * Replaces window.confirm() with an in-app dialog. Backdrop/Esc/close-button
 * dismissal are all suppressed while `loading` is true, so an in-flight
 * action can't be dismissed out from under itself.
 */
export default function ConfirmDialog({
  open,
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
  const lines = Array.isArray(message) ? message.filter(Boolean) : [message];

  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-md"
      closeOnBackdrop={!loading}
      closeOnEsc={!loading}
      showCloseButton={!loading}
      initialFocusRef={cancelButtonRef}
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors ${
              variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#15803d] hover:bg-[#166534]'
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      }
    >
      {lines.map((line, i) => (
        <p
          key={i}
          className={i === 0 ? 'text-sm text-gray-600 leading-relaxed' : 'text-xs text-gray-500 font-medium mt-2 leading-relaxed'}
        >
          {line}
        </p>
      ))}
    </ModalShell>
  );
}
