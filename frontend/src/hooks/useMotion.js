import { useLayoutEffect, useRef } from 'react';
import { animateMotion } from '@/utils/motion';

export default function useMotion(ref, trigger, kind = 'context', { active = true, initial = true } = {}) {
  const previous = useRef({ trigger, active });
  useLayoutEffect(() => {
    const changed = previous.current.trigger !== trigger || previous.current.active !== active;
    previous.current = { trigger, active };
    if (!active || (!changed && !initial)) return undefined;
    return animateMotion(ref.current, kind);
  }, [ref, trigger, kind, active, initial]);
}
