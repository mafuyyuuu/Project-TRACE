import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal chrome: portal + backdrop + panel, split into a scrollable
 * body and a footer pinned to the bottom regardless of body scroll position.
 *
 * Every existing modal hand-rolls this same shell with the footer as the
 * last scrolling child, which is why long forms lose their action buttons
 * off-screen. New modals should build on this instead of repeating that.
 */
const DEFAULT_BACKDROP_CLASS_NAME =
  'absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity duration-200';
const DEFAULT_CLOSE_BUTTON_CLASS_NAME =
  'absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100';
const DEFAULT_FOOTER_CLASS_NAME =
  'shrink-0 px-6 sm:px-8 py-6 sm:py-8 pt-6 border-t border-gray-100';

export default function ModalShell({
  open,
  onClose,
  title,
  showCloseButton = true,
  children,
  footer,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
  closeOnEsc = true,
  initialFocusRef,
  backdropClassName,
  panelClassName,
  closeButtonClassName,
  closeButtonIcon = '✕',
  closeButtonAriaLabel = 'Close',
  footerClassName,
  bodyClassName,
  bare = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement;

    const focusTarget =
      initialFocusRef?.current ||
      panelRef.current?.querySelector(FOCUSABLE_SELECTOR) ||
      panelRef.current;
    focusTarget?.focus();

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (closeOnEsc) onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isInside = panelRef.current.contains(document.activeElement);

      if (e.shiftKey) {
        if (document.activeElement === first || !isInside) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !isInside) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const resolvedPanelClassName =
    panelClassName ??
    `bg-white rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[calc(100dvh-2rem)] z-10 border border-gray-100 relative animate-slide-up flex flex-col overflow-hidden`;
  const resolvedBodyClassName =
    bodyClassName ?? `flex-1 overflow-y-auto px-6 sm:px-8 pb-6 sm:pb-8 ${title ? 'pt-2' : 'pt-6 sm:pt-8'}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div
        className={backdropClassName ?? DEFAULT_BACKDROP_CLASS_NAME}
        onClick={() => closeOnBackdrop && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={!bare && title ? titleId : undefined}
        aria-label={bare && typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={resolvedPanelClassName}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeButtonAriaLabel}
            className={closeButtonClassName ?? DEFAULT_CLOSE_BUTTON_CLASS_NAME}
          >
            {closeButtonIcon}
          </button>
        )}

        {bare ? (
          children
        ) : (
          <>
            {title && (
              <div className="shrink-0 px-6 sm:px-8 pt-6 sm:pt-8 pb-2 pr-14">
                <h3 id={titleId} className="text-xl font-black text-gray-900">
                  {title}
                </h3>
              </div>
            )}

            <div className={resolvedBodyClassName}>{children}</div>

            {footer && (
              <div className={footerClassName ?? DEFAULT_FOOTER_CLASS_NAME}>
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
