import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Loaded before any test file, so modules that read config at import time
    // (config/env.js, config/db.js) never touch a real database.
    setupFiles: ['./test/setup.js'],
    // Tests are CommonJS on purpose. The backend source is CJS, and only a CJS
    // test shares Node's require cache with it — which is what lets
    // `vi.spyOn(model, 'fn')` actually intercept the call the service makes.
    // An ESM test would get a separate module instance and hit the real DB.
    include: ['src/**/__tests__/**/*.test.cjs'],
    globals: true,
    restoreMocks: true,
  },
});
