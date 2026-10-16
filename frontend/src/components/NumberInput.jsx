import { useRef } from 'react';

import { NUMBER_LIMITS } from '@/utils/inputLimits';

/** Keep numeric drafts within the supported range without rounding or clamping. */
export default function NumberInput({ value, defaultValue, onChange, onKeyDown,
  min = 0, max = NUMBER_LIMITS.quantity, step = 1, ...props }) {
  const accepted = useRef(defaultValue ?? '');
  const places = String(step).split('.')[1]?.length || 0;
  const digits = String(Math.floor(Math.max(Math.abs(Number(min)), Math.abs(Number(max))))).length;
  const pattern = new RegExp(`^${Number(min) < 0 ? '-?' : ''}\\d{0,${digits}}${places ? `(\\.\\d{0,${places}})?` : ''}$`);
  return <input {...props} type="number" inputMode={places ? 'decimal' : 'numeric'}
    min={min} max={max} step={step} value={value} defaultValue={defaultValue}
    onKeyDown={event => {
      if (!event.ctrlKey && !event.metaKey && (['e', 'E', '+'].includes(event.key)
        || (event.key === '-' && Number(min) >= 0) || (event.key === '.' && !places))) event.preventDefault();
      onKeyDown?.(event);
    }}
    onChange={event => {
      const next = event.target.value;
      if (!pattern.test(next) || (next !== '' && Math.abs(Number(next)) > Math.max(Math.abs(Number(min)), Math.abs(Number(max))))) {
        event.target.value = String(value ?? accepted.current);
        return;
      }
      accepted.current = next;
      onChange?.(event);
    }} />;
}
