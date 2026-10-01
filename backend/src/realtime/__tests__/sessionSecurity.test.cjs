const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const sessions = require('../../models/session.model');
const { authenticateToken } = require('../index');
const claims = { id: 3, role: 'student', token_version: 2 };
const token = extra => jwt.sign({ ...claims, ...extra }, env.JWT_SECRET, { expiresIn: '1h' });
beforeEach(() => {
  vi.spyOn(pool, 'query').mockResolvedValue([[{ token_version: 2, is_active: 1 }]]);
  vi.spyOn(sessions, 'revoked').mockResolvedValue(false);
});
it.each([{ pending_2fa: true }, { token_version: undefined }, { role: 'invalid' }, { id: '3' }])('refuses incomplete socket authentication %j', async extra => {
  await expect(authenticateToken(token(extra))).rejects.toThrow();
  expect(pool.query).not.toHaveBeenCalled();
});
it.each([{ token_version: 3, is_active: 1 }, { token_version: 2, is_active: 0 }])('refuses revoked or deactivated socket accounts', async account => {
  pool.query.mockResolvedValue([[account]]);
  await expect(authenticateToken(token())).rejects.toThrow('Revoked session');
});
it('refuses the exact logged-out token even if account version is unchanged', async () => {
  sessions.revoked.mockResolvedValue(true);
  await expect(authenticateToken(token())).rejects.toThrow('Ended session');
});
it('refuses expired tokens before querying account state', async () => {
  const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 1 }, env.JWT_SECRET);
  await expect(authenticateToken(expired)).rejects.toThrow();
  expect(pool.query).not.toHaveBeenCalled();
});
it('returns only room identity for a fully authenticated session', async () => {
  const result = await authenticateToken(token({ full_name: 'Sensitive name' }));
  expect(result).toMatchObject({ id: 3, role: 'student' });
  expect(result).not.toHaveProperty('full_name');
});
it.each([{ role: 'clerk', must_change_password: 1 }, { role: 'student', user_type: 'alumni', has_grad_application: 0 }])('denies notification sockets while onboarding is mandatory', async account => {
  pool.query.mockResolvedValue([[{ token_version: 2, is_active: 1, ...account }]]);
  await expect(authenticateToken(token({ role: account.role }))).rejects.toThrow('Complete account onboarding');
});
