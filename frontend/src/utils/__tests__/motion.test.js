import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateMotion, cancelMotion, clearDrillExits, prepareDrillExit } from '@/utils/motion';

const css = readFileSync('src/index.css', 'utf8');
const declaredTokens = [...css.matchAll(/(--trace-motion-[\w-]+):\s*([^;]+);/g)];
let media;
let animations;
const originalAnimate = Element.prototype.animate;
beforeEach(() => {
  media = new EventTarget();
  media.matches = false;
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  animations = [];
  Element.prototype.animate = vi.fn((frames, options) => {
    const animation = { cancel: vi.fn(), frames, options };
    animations.push(animation);
    return animation;
  });
  for (const [, key, value] of declaredTokens) document.documentElement.style.setProperty(key, value);
  expect(declaredTokens.length).toBeGreaterThan(10);
  expect(getComputedStyle(document.documentElement).getPropertyValue('--trace-motion-context-duration')).toBe('220ms');
});
afterEach(() => {
  clearDrillExits();
  document.body.replaceChildren();
  for (const [, key] of declaredTokens) document.documentElement.style.removeProperty(key);
  Element.prototype.animate = originalAnimate;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const panel = () => {
  const element = document.createElement('div');
  document.body.appendChild(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 16, top: 16, width: 288, height: 300 });
  return element;
};

describe('Shared motion', () => {
  it('reads configurable tokens and replaces interrupted motion from its current presentation', () => {
    const element = panel();
    const stop = animateMotion(element, 'context');
    expect(animations[0].options.duration).toBe(220);
    expect(animations[0].frames[0].transform).toBe('translateY(8px)');
    element.style.opacity = '0.92';
    element.style.transform = 'translateY(2px)';
    stop();
    document.documentElement.style.setProperty('--trace-motion-context-duration', '190ms');
    animateMotion(element, 'context');
    expect(animations[0].cancel).toHaveBeenCalledOnce();
    expect(animations[1].frames[0]).toEqual({ opacity: '0.92', transform: 'translateY(2px)' });
    expect(animations[1].options.duration).toBe(190);
    cancelMotion(element);
    expect(animations[1].cancel).toHaveBeenCalledOnce();
  });

  it('removes movement immediately when reduced motion changes and works without animation APIs', () => {
    const element = panel();
    animateMotion(element, 'drill');
    media.matches = true;
    const event = new Event('change');
    event.matches = true;
    media.dispatchEvent(event);
    expect(animations[0].cancel).toHaveBeenCalledOnce();
    animateMotion(element, 'context');
    expect(animations).toHaveLength(1);
    media.matches = false;
    element.animate = undefined;
    expect(() => animateMotion(element)).not.toThrow();
  });

  it('cleans up externally cancelled motion without leaving a preference listener', () => {
    const element = panel();
    const remove = vi.spyOn(media, 'removeEventListener');
    animateMotion(element, 'context');
    animations[0].oncancel();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    cancelMotion(element);
    expect(animations[0].cancel).not.toHaveBeenCalled();
  });

  it('dismisses the live dialog immediately and bounds a sanitized visual exit', () => {
    vi.useFakeTimers();
    const element = panel();
    element.setAttribute('role', 'dialog');
    element.dataset.modalLayer = 'modal';
    element.innerHTML = '<p id="private-label" aria-live="polite">Detail</p><input id="password" type="password" value="secret-value"><button id="save">Save</button><iframe src="about:blank"></iframe>';
    element.firstChild.scrollTop = 80;
    const finishExit = prepareDrillExit(element);
    element.remove();
    finishExit();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const copy = document.querySelector('[data-motion-exit]');
    expect(copy).toHaveAttribute('aria-hidden', 'true');
    expect(copy.inert).toBe(true);
    expect(copy.querySelector('[id], [data-modal-layer], iframe, [aria-live]')).toBeNull();
    expect(copy.innerHTML).not.toContain('secret-value');
    expect(copy.querySelector('button')).toBeDisabled();
    expect(copy.querySelector('input')).toHaveValue('');
    expect(copy.firstChild.scrollTop).toBe(80);
    vi.advanceTimersByTime(251);
    expect(copy.isConnected).toBe(false);
    expect(animations[0].cancel).toHaveBeenCalledOnce();
  });

  it('removes exit copies on finish, cancel, reduced motion or a new drill entry', () => {
    for (const reason of ['finish', 'cancel', 'reduce', 'new']) {
      media.matches = false;
      const element = panel();
      const exit = prepareDrillExit(element);
      element.remove();
      exit();
      expect(document.querySelector('[data-motion-exit]')).not.toBeNull();
      const animation = animations.at(-1);
      if (reason === 'finish') animation.onfinish();
      if (reason === 'cancel') animation.oncancel();
      if (reason === 'new') clearDrillExits();
      if (reason === 'reduce') {
        media.matches = true;
        const event = new Event('change'); event.matches = true; media.dispatchEvent(event);
      }
      expect(document.querySelector('[data-motion-exit]')).toBeNull();
    }
  });
  it('excludes marked credential regions, including text and QR images, from visual exits', () => {
    const element = panel();
    element.innerHTML = '<p>Public heading</p><section data-motion-private><code>SYNTHETIC-SETUP-KEY</code><ul><li>SYNTHETIC-RECOVERY-CODE</li></ul><img src="data:image/png;base64,c3ludGhldGlj" alt="Authenticator setup"></section>';
    const exit = prepareDrillExit(element);
    element.remove();
    exit();
    const copy = document.querySelector('[data-motion-exit]');
    expect(copy).toHaveTextContent('Public heading');
    expect(copy.innerHTML).not.toContain('SYNTHETIC-SETUP-KEY');
    expect(copy.innerHTML).not.toContain('SYNTHETIC-RECOVERY-CODE');
    expect(copy.querySelector('img, [data-motion-private]')).toBeNull();
    clearDrillExits();
    const privatePanel = panel();
    privatePanel.setAttribute('data-motion-private', '');
    const privateExit = prepareDrillExit(privatePanel);
    privatePanel.remove();
    privateExit();
    expect(document.querySelector('[data-motion-exit]')).toBeNull();
  });

  it('does not leave a late exit after rapid reopen, StrictMode rehearsal, or reduced-motion dismissal', () => {
    const element = panel();
    const exit = prepareDrillExit(element);
    exit();
    expect(document.querySelector('[data-motion-exit]')).toBeNull();
    element.remove();
    clearDrillExits();
    exit();
    expect(document.querySelector('[data-motion-exit]')).toBeNull();
    media.matches = true;
    prepareDrillExit(panel())();
    expect(document.querySelector('[data-motion-exit]')).toBeNull();
  });
});
