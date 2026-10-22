const path = require('path');
const { spawnSync } = require('child_process');

it('refuses the publicly documented signing-key placeholder in production', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
    cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'trace-jwt-secret-change-in-production' },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('public placeholder');
});
