import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

const finePointer = '(hover: hover) and (pointer: fine)';

/** One tooltip for the rail; the labeled drawer never requires hover. */
export default function useSidebarTooltip(rootRef, context, enabled) {
  const id = useId();
  const tooltipRef = useRef(null);
  const intent = useRef({ hover: null, focus: null, dismissed: null });
  const [selection, setSelection] = useState(null);
  const active = enabled && selection?.context === context ? selection : null;
  const control = target => target instanceof Element ? target.closest('[data-nav-label]') : null;
  const contains = (parent, target) => target instanceof Node && !!parent?.contains(target);
  const sync = () => {
    const current = intent.current;
    const target = current.hover || current.focus;
    if (current.dismissed && current.hover !== current.dismissed && current.focus !== current.dismissed) current.dismissed = null;
    setSelection(enabled && target && target !== current.dismissed && rootRef.current?.contains(target)
      ? { target, label: target.dataset.navLabel, context } : null);
  };
  const dismiss = () => {
    intent.current = { hover: null, focus: null, dismissed: active?.target || null };
    setSelection(null);
  };

  useLayoutEffect(() => {
    if (!active || !tooltipRef.current) return;
    const rect = active.target.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const bounds = tooltip.getBoundingClientRect();
    // Runtime viewport geometry only; the visual recipe remains in Tailwind/CSS.
    const left = Math.min(rect.right, window.innerWidth - bounds.width - 8);
    const top = Math.min(Math.max(8, rect.top + (rect.height - bounds.height) / 2), Math.max(8, window.innerHeight - bounds.height - 8));
    tooltip.style.setProperty('--trace-tooltip-left', Math.max(8, left) + 'px');
    tooltip.style.setProperty('--trace-tooltip-top', top + 'px');
  }, [active, rootRef]);

  useLayoutEffect(() => {
    // Context replacements invalidate old controls even when their labels match.
    intent.current = { hover: null, focus: null, dismissed: null };
  }, [context, enabled]);

  useEffect(() => {
    if (!active) return;
    const hide = () => {
      intent.current = { hover: null, focus: null, dismissed: null };
      setSelection(null);
    };
    const refresh = () => {
      const rect = active.target.getBoundingClientRect();
      const rail = rootRef.current?.closest('.trace-nav-scroll')?.getBoundingClientRect();
      const visible = rect.width > 0 && rect.bottom > (rail?.top || 0) && rect.top < (rail?.bottom || window.innerHeight);
      if (visible && intent.current.focus === active.target && document.activeElement === active.target) {
        setSelection({ ...active });
      } else hide();
    };
    const escape = event => {
      if (event.key !== 'Escape') return;
      intent.current.dismissed = active.target;
      setSelection(null);
      event.preventDefault();
      event.stopPropagation();
    };
    const media = window.matchMedia?.(finePointer);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);
    media?.addEventListener?.('change', hide);
    return () => {
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
      media?.removeEventListener?.('change', hide);
    };
  }, [active, rootRef]);

  return {
    id, active, tooltipRef,
    description: label => active?.label === label ? id : undefined,
    rootEvents: {
      onPointerOver: event => {
        if (!enabled || event.pointerType === 'touch' || !window.matchMedia?.(finePointer).matches) return;
        const target = control(event.target);
        if (!target || !rootRef.current?.contains(target) || intent.current.hover === target) return;
        intent.current.hover = target;
        sync();
      },
      onPointerOut: event => {
        const target = control(event.target);
        if (!target || contains(target, event.relatedTarget) || contains(tooltipRef.current, event.relatedTarget)) return;
        if (intent.current.hover === target) intent.current.hover = null;
        sync();
      },
      onFocusCapture: event => {
        if (!enabled || !event.target.matches(':focus-visible')) return;
        intent.current.hover = null;
        intent.current.focus = control(event.target);
        sync();
      },
      onBlurCapture: event => {
        if (intent.current.focus === control(event.target)) intent.current.focus = null;
        sync();
      },
      onClickCapture: dismiss,
      onPointerDownCapture: event => { if (event.pointerType === 'touch') dismiss(); },
    },
    tooltipEvents: {
      onPointerLeave: event => {
        if (contains(active?.target, event.relatedTarget)) return;
        intent.current.hover = null;
        sync();
      },
    },
  };
}
