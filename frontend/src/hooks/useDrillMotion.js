import { useCallback, useLayoutEffect, useRef } from 'react';
import { animateMotion, cancelMotion, clearDrillExits, prepareDrillExit } from '@/utils/motion';

export default function useDrillMotion(ref, open, layer = 'modal') {
  const detachedExit = useRef(null);
  // Capture before DOM removal: an open=false update can remove the portal
  // before layout-effect cleanup, leaving no geometry for the visual exit.
  const attachPanel = useCallback(panel => {
    if (!panel && ref.current) detachedExit.current = prepareDrillExit(ref.current, layer);
    if (panel) detachedExit.current = null;
    ref.current = panel;
  }, [ref, layer]);
  useLayoutEffect(() => {
    if (!open || !ref.current) return undefined;
    clearDrillExits();
    const panel = ref.current;
    const origin = document.activeElement;
    if (origin?.matches('button, a, input, select, textarea')) {
      const from = origin.getBoundingClientRect();
      const to = panel.getBoundingClientRect();
      const x = Math.max(0, Math.min(to.width, from.left + from.width / 2 - to.left));
      const y = Math.max(0, Math.min(to.height, from.top + from.height / 2 - to.top));
      panel.style.transformOrigin = `${x}px ${y}px`;
    }
    animateMotion(panel, layer === 'feedback' ? 'feedback' : 'drill');
    return () => {
      const exit = detachedExit.current || prepareDrillExit(panel, layer);
      cancelMotion(panel);
      // StrictMode rehearsal and effect replacements leave the panel connected.
      // Only a real DOM removal may produce a noninteractive visual exit.
      queueMicrotask(() => {
        if (panel.isConnected) return;
        exit();
        if (origin?.isConnected && origin.matches('button, a')) animateMotion(origin, 'return');
      });
    };
  }, [ref, open, layer]);
  return attachPanel;
}
