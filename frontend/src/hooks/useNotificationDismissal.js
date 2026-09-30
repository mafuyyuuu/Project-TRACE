import { useEffect, useRef } from 'react';

/** Close feedback on navigation, internal tab changes, or leaving the browser tab. */
export default function useNotificationDismissal(onDismiss, dismissalKey) {
  const previousKey = useRef(dismissalKey);
  useEffect(() => {
    const dismiss = () => onDismiss?.();
    const hidden = () => { if (document.hidden) dismiss(); };
    window.addEventListener('trace:notification-navigation', dismiss);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('trace:notification-navigation', dismiss);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [onDismiss]);
  useEffect(() => {
    if (previousKey.current !== dismissalKey) {
      previousKey.current = dismissalKey;
      onDismiss?.();
    }
  }, [dismissalKey, onDismiss]);
}
