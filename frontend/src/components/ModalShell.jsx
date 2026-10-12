import Button from '@/components/Button';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import useDrillMotion from '@/hooks/useDrillMotion';

const FOCUSABLE_SELECTOR =
  'a[href], button, textarea, input:not([type="hidden"]), select, [tabindex], [contenteditable="true"]';

// Only the most recently opened shell handles focus and dismissal: a
// confirmation can sit above a form, and a receipt viewer above either one.
const modalStack = [];

function getTopmostPanel() {
  return modalStack.findLast((panel) => panel.dataset.modalLayer === 'feedback') || modalStack.at(-1);
}

function getFocusableElements(panel) {
  return [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.matches(':disabled') || element.tabIndex < 0 || element.closest('[hidden], [inert]')) return false;
    for (let current = element; current && current !== panel; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
}

/**
 * Shared modal chrome: portal + backdrop + panel, split into a scrollable
 * body and a footer pinned to the bottom regardless of body scroll position.
 *
 * Pass actions through `footer` so only the body scrolls. Override props
 * support lightboxes and split-column forms without duplicating the shell.
 */
const DEFAULT_BACKDROP_CLASS_NAME =
  'absolute inset-0 bg-gray-900/60 dark:bg-gray-800/60 backdrop-blur-md transition-opacity';
const DEFAULT_CLOSE_BUTTON_CLASS_NAME =
  'trace-icon-button absolute top-3 right-3 z-10';
const DEFAULT_FOOTER_CLASS_NAME =
  'trace-modal-footer';

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
  descriptionId,
  busy = false,
  layer = 'modal',
  backdropClassName,
  backdropStyle,
  panelStyle,
  panelClassName,
  closeButtonClassName,
  closeButtonIcon = '✕',
  closeButtonAriaLabel = 'Close',
  footerClassName,
  headerClassName,
  bodyClassName,
  bare = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const attachPanel = useDrillMotion(panelRef, open, layer);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    modalStack.push(panel);

    const focusTarget =
      initialFocusRef?.current ||
      getFocusableElements(panel)[0] ||
      panel;
    if (getTopmostPanel() === panel) focusTarget?.focus();

    return () => {
      const wasTopmost = getTopmostPanel() === panel;
      modalStack.splice(modalStack.indexOf(panel), 1);
      if (!wasTopmost) return;

      const remainingPanel = getTopmostPanel();
      if (previouslyFocused?.isConnected && (!remainingPanel || remainingPanel.contains(previouslyFocused))) {
        previouslyFocused.focus?.();
      } else if (remainingPanel) {
        (getFocusableElements(remainingPanel)[0] || remainingPanel).focus();
      }
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;

    const handleKeyDown = (e) => {
      if (getTopmostPanel() !== panel) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (closeOnEsc) onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isInside = focusable.includes(document.activeElement);

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

    const handleFocusIn = (e) => {
      if (getTopmostPanel() !== panel || panel.contains(e.target)) return;
      (getFocusableElements(panel)[0] || panel).focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const resolvedPanelClassName =
    panelClassName ??
    `trace-modal-panel ${maxWidth}`;
  const resolvedBodyClassName =
    bodyClassName ?? `trace-modal-body ${title ? 'pt-2' : 'pt-4 sm:pt-6'}`;

  return createPortal(
    <div className={`trace-modal-overlay fixed inset-0 ${layer === 'feedback' ? 'z-[110]' : 'z-[100]'} flex items-start sm:items-center justify-center p-4 overflow-y-auto animate-fade-in`}>
      <div
        className={backdropClassName ?? DEFAULT_BACKDROP_CLASS_NAME}
        style={backdropStyle}
        onClick={() => closeOnBackdrop && onClose()}
        aria-hidden="true"
      />
      <div
        ref={attachPanel}
        data-modal-layer={layer}
        role="dialog"
        aria-modal="true"
        aria-describedby={descriptionId}
        aria-busy={busy || undefined}
        aria-labelledby={!bare && title ? titleId : undefined}
        aria-label={bare && typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={resolvedPanelClassName}
        style={panelStyle}
      >
        {showCloseButton && (
          <Button
            type="button"
            onClick={onClose}
            aria-label={closeButtonAriaLabel}
            className={closeButtonClassName ?? DEFAULT_CLOSE_BUTTON_CLASS_NAME}
          >
            {closeButtonIcon}
          </Button>
        )}

        {bare ? (
          children
        ) : (
          <>
            {title && (
              <div className={headerClassName ?? 'trace-modal-header'}>
                <h3 id={titleId} className="trace-modal-title">
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
