const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { authenticate } = require('../auth.middleware');
async function check(claims, account = { token_version: 2, is_active: 1 }) {
  vi.spyOn(pool, 'query').mockImplementation(async sql => sql.startsWith('SELECT token_hash') ? [[]] : [[account]]);
  const token = jwt.sign(claims, env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }; const next = vi.fn();
  await authenticate(req, res, next); return { req, res, next };
}
it.each([
  { id: 3, pending_2fa: true, token_version: 2 },
  { id: 3, pending_2fa: true, role: 'student', token_version: 2 },
  { id: 3, role: 'student' },
  { id: 3, role: 'unknown', token_version: 2 },
])('rejects temporary and malformed tokens: %j', async claims => {
  const result = await check(claims);
  expect(result.next).not.toHaveBeenCalled(); expect(result.res.status).toHaveBeenCalledWith(401);
});
it.each([{ token_version: 3, is_active: 1 }, { token_version: 2, is_active: 0 }])('rejects revoked or inactive sessions', async account => {
  const result = await check({ id: 3, role: 'student', token_version: 2 }, account);
  expect(result.next).not.toHaveBeenCalled();
});
it('passes the authenticated version to factor-change services', async () => {
  const result = await check({ id: 3, role: 'student', token_version: 2 });
  expect(result.req.user.token_version).toBe(2); expect(result.next).toHaveBeenCalledOnce();
});

it('denies a logged-out session while its JWT is otherwise valid', async () => {
  const sessions = require('../../models/session.model');
  vi.spyOn(sessions, 'revoked').mockResolvedValue(true);
  const result = await check({ id: 3, role: 'student', token_version: 2 });
  expect(result.next).not.toHaveBeenCalled(); expect(result.res.status).toHaveBeenCalledWith(401);
});
