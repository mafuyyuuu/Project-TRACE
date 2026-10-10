import Button from '@/components/Button';
import { useId, useRef } from 'react';
import ModalShell from '@/components/ModalShell';

/**
 * Replaces window.confirm() with an in-app dialog. Cancel/backdrop/Esc
 * dismissal are all suppressed while `loading` is true, so an in-flight
 * action can't be dismissed out from under itself.
 */
export default function ConfirmDialog({
  open,
  children,
  maxWidth = 'max-w-[535px]',
  presentation = 'compact',
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
      showCloseButton={false}
      headerClassName={`shrink-0 px-5 pt-6 pb-2 ${presentation === 'compact' ? 'text-center' : ''}`}
      bodyClassName={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 ${presentation === 'compact' ? 'text-center' : ''}`}
      footerClassName="shrink-0 px-5 pb-6 pt-2"
      initialFocusRef={cancelButtonRef}
      descriptionId={descriptionId}
      busy={loading}
      footer={
        <div className="mx-auto flex w-full max-w-[285px] flex-col sm:flex-row gap-2">
          <Button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={loading}
            className="trace-button trace-button-secondary flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`trace-button flex-1 ${
              variant === 'destructive' ? 'trace-button-danger' : 'trace-button-primary'
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
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
