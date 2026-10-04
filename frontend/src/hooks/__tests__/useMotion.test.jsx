import { StrictMode, useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import useMotion from '@/hooks/useMotion';
import MotionDetails from '@/components/MotionDetails';
import ProgressFill from '@/components/ProgressFill';

const { animateMotion } = vi.hoisted(() => ({ animateMotion: vi.fn(() => vi.fn()) }));
vi.mock('@/utils/motion', () => ({ animateMotion }));
afterEach(() => vi.clearAllMocks());

it('changes context without remounting drafts or resetting the scroll container and cancels on unmount', () => {
  function Context({ selected }) {
    const ref = useRef(null);
    const [draft, setDraft] = useState('');
    useMotion(ref, selected, 'context');
    return <div ref={ref} data-testid="context"><input value={draft} onChange={event => setDraft(event.target.value)} /></div>;
  }
  const { rerender, unmount } = render(<Context selected="one" />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'Unsaved draft' } });
  screen.getByTestId('context').scrollTop = 80;
  const stop = animateMotion.mock.results.at(-1).value;
  rerender(<Context selected="two" />);
  expect(input).toHaveValue('Unsaved draft');
  expect(screen.getByTestId('context').scrollTop).toBe(80);
  expect(stop).toHaveBeenCalledOnce();
  const latest = animateMotion.mock.results.at(-1).value;
  unmount();
  expect(latest).toHaveBeenCalledOnce();
});

it('does not replay a page entrance during StrictMode rehearsal', () => {
  function Page({ selected }) {
    const ref = useRef(null);
    useMotion(ref, selected, 'context', { initial: false });
    return <div ref={ref}>Page</div>;
  }
  const { rerender } = render(<StrictMode><Page selected="one" /></StrictMode>);
  expect(animateMotion).not.toHaveBeenCalled();
  rerender(<StrictMode><Page selected="two" /></StrictMode>);
  expect(animateMotion).toHaveBeenCalledOnce();
});

describe('Continuity', () => {
  it('keeps the native disclosure and its focus while expanding and collapsing', () => {
    render(<StrictMode><MotionDetails summary="FAQ"><p>Answer</p></MotionDetails></StrictMode>);
    const summary = screen.getByText('FAQ');
    const details = summary.closest('details');
    summary.focus();
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(details.open).toBe(true);
    expect(summary).toHaveFocus();
    details.open = false;
    fireEvent(details, new Event('toggle'));
    expect(summary.closest('details')).toBe(details);
    expect(details.open).toBe(false);
    expect(animateMotion).toHaveBeenLastCalledWith(details, 'continuity');
  });

  it('updates progress on the existing full-width fill without layout width changes', () => {
    const { container, rerender } = render(<ProgressFill value={40} />);
    const fill = container.firstChild;
    expect(fill.style.transform).toBe('scaleX(0.4)');
    rerender(<ProgressFill value={100} />);
    expect(container.firstChild).toBe(fill);
    expect(fill.style.transform).toBe('scaleX(1)');
    expect(fill.style.width).toBe('');
    rerender(<ProgressFill value={-20} />);
    expect(fill.style.transform).toBe('scaleX(0)');
  });
});
