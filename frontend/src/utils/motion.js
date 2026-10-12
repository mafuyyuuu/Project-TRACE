const running = new WeakMap();
const presentation = new WeakMap();
const exits = new Set();
let drillGeneration = 0;
const reducedQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return window.matchMedia?.(reducedQuery).matches ?? false;
}

function tokens(kind) {
  const style = getComputedStyle(document.documentElement);
  const value = name => style.getPropertyValue(`--trace-motion-${name}`).trim();
  const duration = Number.parseFloat(value(`${kind}-duration`));
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    duration, easing: value('easing'), opacity: value('opacity'),
    distance: value(`${kind}-distance`) || '0px', scale: value('scale'),
  };
}

export function cancelMotion(element, preserve = false) {
  const record = running.get(element);
  if (!record) return;
  if (preserve) {
    const style = getComputedStyle(element);
    presentation.set(element, { opacity: style.opacity, transform: style.transform });
  } else presentation.delete(element);
  record.stop();
}

/** Progressive enhancement: state and focus never wait for this animation. */
export function animateMotion(element, kind = 'context') {
  if (!element?.animate || prefersReducedMotion()) {
    if (element) cancelMotion(element);
    return () => {};
  }
  const timing = tokens(kind);
  if (!timing) return () => {};
  cancelMotion(element, true);
  const start = presentation.get(element) || {
    opacity: timing.opacity,
    transform: kind === 'drill' || kind === 'return'
      ? `translateY(${timing.distance}) scale(${timing.scale})`
      : `translateY(${timing.distance})`,
  };
  presentation.delete(element);
  let animation;
  try { animation = element.animate([start, { opacity: 1, transform: 'none' }], timing); }
  catch { return () => {}; }
  const media = window.matchMedia?.(reducedQuery);
  const stop = () => {
    media?.removeEventListener?.('change', onPreference);
    if (running.get(element)?.animation === animation) running.delete(element);
    animation.cancel();
  };
  const onPreference = event => { if (event.matches) { presentation.delete(element); stop(); } };
  const settle = () => {
    media?.removeEventListener?.('change', onPreference);
    if (running.get(element)?.animation === animation) {
      running.delete(element);
      presentation.delete(element);
    }
  };
  animation.onfinish = settle;
  animation.oncancel = settle;
  media?.addEventListener?.('change', onPreference);
  running.set(element, { animation, stop });
  return () => cancelMotion(element, true);
}

export function clearDrillExits() {
  drillGeneration += 1;
  for (const remove of [...exits]) remove();
}

/** Capture only a transient visual, never a second interactive dialog. */
export function prepareDrillExit(panel, layer = 'modal') {
  if (!panel?.animate || panel.closest('[data-motion-private]') || prefersReducedMotion()) return () => {};
  const timing = tokens('exit');
  const rect = panel.getBoundingClientRect();
  if (!timing || !rect.width || !rect.height) return () => {};
  const opacity = getComputedStyle(panel).opacity;
  const generation = drillGeneration;
  const copy = panel.cloneNode(true);
  const nodes = [copy, ...copy.querySelectorAll('*')];
  const sources = [panel, ...panel.querySelectorAll('*')];
  const scrollPositions = nodes.map((node, index) => ({
    node, top: sources[index].scrollTop, left: sources[index].scrollLeft,
  }));
  for (const node of nodes) {
    for (const attribute of [...node.attributes]) {
      if (/^(id|name|role|tabindex|autofocus|data-modal-layer|aria-.+|on.+)$/i.test(attribute.name)) node.removeAttribute(attribute.name);
    }
    node.classList.remove(...[...node.classList].filter(name => name.startsWith('animate-')));
    if ('disabled' in node) node.disabled = true;
    if (node.matches('input, textarea, select')) { node.value = ''; node.removeAttribute('value'); node.textContent = ''; }
    // MFA setup QR/manual secrets and recovery codes are text/images too;
    // clearing input values alone is insufficient for a security-panel exit.
    if (node.matches('[data-motion-private]')) node.remove();
    if (node.matches('iframe, object, embed, video, audio, script, link, style')) node.remove();
    if (node.matches('img') && !/^(blob:|data:)/.test(node.src)) node.remove();
  }
  copy.classList.add('trace-motion-exit-panel');
  copy.inert = true;
  copy.setAttribute('aria-hidden', 'true');
  copy.dataset.motionExit = layer;
  // Measured viewport coordinates are runtime geometry, not a second style recipe.
  for (const [name, value] of Object.entries({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })) {
    copy.style.setProperty(`--trace-exit-${name}`, `${value}px`);
  }
  let remove;
  return () => {
    if (panel.isConnected || generation !== drillGeneration || prefersReducedMotion()) return;
    document.body.appendChild(copy);
    for (const { node, top, left } of scrollPositions) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
    let alive = true;
    let animation;
    const media = window.matchMedia?.(reducedQuery);
    remove = () => {
      if (!alive) return;
      alive = false;
      clearTimeout(timer);
      media?.removeEventListener?.('change', onPreference);
      exits.delete(remove);
      animation?.cancel();
      copy.remove();
    };
    const onPreference = event => { if (event.matches) remove(); };
    const timer = setTimeout(remove, timing.duration + 50);
    exits.add(remove);
    media?.addEventListener?.('change', onPreference);
    try {
      animation = copy.animate([
        { opacity, transform: 'none' },
        { opacity: 0, transform: `translateY(${timing.distance}) scale(${timing.scale})` },
      ], timing);
      animation.onfinish = remove;
      animation.oncancel = remove;
    } catch { remove(); }
  };
}
