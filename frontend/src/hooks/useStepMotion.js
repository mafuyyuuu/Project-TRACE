import { useLayoutEffect, useRef } from 'react';
import { animateMotion } from '@/utils/motion';

/** Presentation only: move the current step without replacing its DOM or draft. */
export default function useStepMotion(ref, step) {
  const previous = useRef(step);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = step;
    if (from === step) return undefined;
    return animateMotion(ref.current, 'step', { direction: step > from ? 1 : -1 });
  }, [ref, step]);
}
