import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ModalShell from '@/components/ModalShell';
import { clearDrillExits } from '@/utils/motion';

let animations;
const originalAnimate = Element.prototype.animate;
beforeEach(() => {
  animations = [];
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  for (const [name, value] of Object.entries({ 'drill-duration': '250ms', 'exit-duration': '200ms', 'return-duration': '150ms', easing: 'ease-out', opacity: '0.6', scale: '0.96', 'drill-distance': '12px', 'exit-distance': '8px' })) document.documentElement.style.setProperty(`--trace-motion-${name}`, value);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { left: 20, top: 20, width: this.isConnected ? 300 : 0, height: this.isConnected ? 300 : 0 };
  });
  Element.prototype.animate = vi.fn(function (frames, options) {
    const animation = { cancel: vi.fn(), frames, options };
    animations.push({ element: this, animation });
    return animation;
  });
});
afterEach(() => {
  clearDrillExits();
  document.documentElement.removeAttribute('style');
  Element.prototype.animate = originalAnimate;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Example() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open detail</button>
    <ModalShell open={open} title="Detail" onClose={() => setOpen(false)}><input aria-label="Private value" defaultValue="synthetic-private-value" /></ModalShell></>;
}

it('captures an open=false portal exit before removal while restoring focus immediately', async () => {
  render(<StrictMode><Example /></StrictMode>);
  const trigger = screen.getByRole('button', { name: 'Open detail' });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: 'Escape' });
  await act(async () => {});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  const copy = document.querySelector('[data-motion-exit]');
  expect(copy).not.toBeNull();
  expect(copy).toHaveAttribute('aria-hidden', 'true');
  expect(copy.inert).toBe(true);
  expect(copy.querySelector('input')).toHaveValue('');
  expect(copy.innerHTML).not.toContain('synthetic-private-value');
  expect(animations.find(item => item.element === copy).animation.options.duration).toBe(200);
  fireEvent.click(trigger);
  expect(document.querySelector('[data-motion-exit]')).toBeNull();
  expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
});
