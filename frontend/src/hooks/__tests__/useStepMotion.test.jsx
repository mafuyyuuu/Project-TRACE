import { StrictMode, useRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import useStepMotion from '@/hooks/useStepMotion';

const { animateMotion } = vi.hoisted(() => ({ animateMotion: vi.fn(() => vi.fn()) }));
vi.mock('@/utils/motion', () => ({ animateMotion }));
afterEach(() => vi.clearAllMocks());

function Wizard({ step }) {
  const ref = useRef(null);
  const [draft, setDraft] = useState('');
  useStepMotion(ref, step);
  return <form ref={ref}><input aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)} /></form>;
}

it('keeps draft, focus, DOM and scroll while following forward and backward steps', () => {
  const { rerender, unmount } = render(<StrictMode><Wizard step={1} /></StrictMode>);
  expect(animateMotion).not.toHaveBeenCalled();
  const input = screen.getByRole('textbox');
  const form = input.form;
  fireEvent.change(input, { target: { value: 'Unsaved purpose' } });
  input.focus();
  form.scrollTop = 72;
  rerender(<StrictMode><Wizard step={2} /></StrictMode>);
  expect(animateMotion).toHaveBeenLastCalledWith(form, 'step', { direction: 1 });
  const stop = animateMotion.mock.results.at(-1).value;
  rerender(<StrictMode><Wizard step={1} /></StrictMode>);
  expect(stop).toHaveBeenCalledOnce();
  expect(animateMotion).toHaveBeenLastCalledWith(form, 'step', { direction: -1 });
  expect(screen.getByRole('textbox')).toBe(input);
  expect(input).toHaveValue('Unsaved purpose');
  expect(input).toHaveFocus();
  expect(form.scrollTop).toBe(72);
  const last = animateMotion.mock.results.at(-1).value;
  unmount();
  expect(last).toHaveBeenCalledOnce();
});

it('does not replay on draft edits, validation messages or the same step', () => {
  const { rerender } = render(<Wizard step={1} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep typing' } });
  rerender(<Wizard step={1} />);
  expect(animateMotion).not.toHaveBeenCalled();
  rerender(<Wizard step={3} />);
  expect(animateMotion).toHaveBeenCalledExactlyOnceWith(screen.getByRole('textbox').form, 'step', { direction: 1 });
});
