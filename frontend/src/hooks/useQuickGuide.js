import { useEffect, useRef, useState } from 'react';
import { startFirstLoginGuide } from '@/services/onboardingService';

export default function useQuickGuide(userId, eligible) {
  const [open, setOpen] = useState(false);
  const attempted = useRef(null);
  useEffect(() => {
    if (!eligible || !userId) return undefined;
    if (attempted.current?.id !== userId) attempted.current = { id: userId, promise: startFirstLoginGuide(), handled: false };
    const attempt = attempted.current;
    if (attempt.handled) return undefined;
    let active = true;
    // The account remembers this display; logout and browser changes do not reset it.
    attempt.promise.then(show => {
      if (!active) return;
      attempt.handled = true;
      if (show) setOpen(true);
    }).catch(() => { if (active) attempt.handled = true; });
    return () => { active = false; };
  }, [userId, eligible]);
  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}
