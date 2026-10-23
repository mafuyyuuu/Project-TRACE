const listeners = new Set();
const allowed = new Set(['documents', 'accounts', 'profile', 'reference', 'support', 'graduate', 'receipts', 'templates']);
let channel;

function notify(resources) {
  const safe = [...new Set(resources)].filter(value => allowed.has(value));
  if (safe.length) listeners.forEach(listener => listener(safe));
}
function sharedChannel() {
  if (channel || typeof window.BroadcastChannel !== 'function') return channel;
  channel = new window.BroadcastChannel('trace-data-changes');
  channel.onmessage = event => {
    if (Array.isArray(event.data?.resources)) notify(event.data.resources);
  };
  return channel;
}

/** Only resource names cross tabs; each tab refetches with its own credentials. */
export function publishDataChange(resources) {
  notify(resources);
  sharedChannel()?.postMessage({ resources: resources.filter(value => allowed.has(value)) });
}
export function receiveDataChange(resources) {
  if (Array.isArray(resources)) notify(resources);
}
export function subscribeDataChanges(listener) {
  listeners.add(listener);
  sharedChannel();
  return () => {
    listeners.delete(listener);
    if (!listeners.size && channel) { channel.close(); channel = undefined; }
  };
}

export function changedResources(url, method = 'get') {
  if (!['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) return [];
  const path = String(url || '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
  if (/\/(?:scan|scan-receipt|extract|preview|print)(?:\/|$)/.test(path)) return [];
  if (/^\/auth\/(?:register|verify-student|students|users)/.test(path)) return ['accounts'];
  if (/^\/auth\/(?:profile|study-years|student\/\d+\/study-years)/.test(path)) return ['profile', 'accounts', 'documents'];
  if (/^\/maintenance\//.test(path)) return ['reference', 'accounts', 'documents'];
  if (/^\/reference\//.test(path)) return ['reference'];
  if (/^\/grad-applications/.test(path)) return ['graduate', 'profile', 'accounts'];
  if (/^\/templates/.test(path)) return ['templates'];
  if (/^\/documents/.test(path)) return ['documents', 'receipts'];
  if (/^\/(?:support|manual-faq|staff-conversations|internal-assistance)/.test(path)) return ['support'];
  return [];
}
