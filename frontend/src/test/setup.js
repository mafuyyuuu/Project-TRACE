import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement the object-URL APIs that useAuthedFile relies on,
 * so provide minimal stand-ins. Individual tests can still spy on these.
 */
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}

/**
 * Node ships a global `localStorage` that throws unless the process was started
 * with --localstorage-file, and it shadows the jsdom implementation. Replace it
 * with a plain in-memory store so tests exercising cached user state (useAuth,
 * useProfileSettings) behave like a browser.
 */
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  });
}
