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
