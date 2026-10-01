/**
 * Login gating, registration behaviour, and the admin-only guards.
 */

vi.mock('../../config/db', () => ({
  pool: {
    query: vi.fn().mockResolvedValue([[]]),
    getConnection: vi.fn(),
  }
}));

const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../../models/user.model');
const referenceModel = require('../../models/referenceData.model');
const notificationModel = require('../../models/notification.model');
const aiEngine = require('../aiEngine.service');
const env = require('../../config/env');
const service = require('../auth.service');
const { pool } = require('../../config/db');
const { authenticate } = require('../../middlewares/auth.middleware');
const trustedBrowser = require('../trustedBrowser.service');
const trustedBrowserModel = require('../../models/trustedBrowser.model');
const authenticator = require('../authenticator.service');
const emailVerification = require('../emailVerification.service');
const passwordResetModel = require('../../models/passwordReset.model');
let credentialConnection;

const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

let passwordHash;

beforeAll(async () => {
  passwordHash = await bcrypt.hash('Trace2024!', 10);
});

const verifiedStudent = () => ({
  id: 3,
  student_id: 'STU-001',
  full_name: 'Ana Reyes',
  role: 'student',
  user_type: 'student',
  desk_assignment: null,
  course: 'CCS',
  verification_status: 'verified',
  password_hash: passwordHash,
});

beforeEach(() => {
  vi.spyOn(passwordResetModel, 'invalidateAllForUser').mockResolvedValue([{}]);
  vi.spyOn(emailVerification, 'issue').mockResolvedValue({ email_sent: true, message: 'Link sent.', pending_email: 'new@example.test', email_verification_required: true });
  vi.spyOn(authenticator, 'isEnabled').mockResolvedValue(false);
  credentialConnection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(credentialConnection);
  vi.spyOn(trustedBrowserModel, 'lockAccount').mockImplementation(async () => ({ id: 3, is_active: 1, token_version: 0, password_hash: passwordHash }));
  vi.spyOn(trustedBrowser, 'isTrusted').mockResolvedValue(false);
  vi.spyOn(trustedBrowser, 'issue').mockResolvedValue(null);
  vi.spyOn(referenceModel, 'findCollegeByName').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findCollegeById').mockResolvedValue([{ id: 2, name: 'College A', is_active: 1 }]);
  vi.spyOn(userModel, 'findActiveByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'findExistingByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'findActiveAdmins').mockResolvedValue([]);
  vi.spyOn(userModel, 'createUser').mockResolvedValue([{ insertId: 1 }]);
  vi.spyOn(userModel, 'deleteById').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(userModel, 'setVerificationStatus').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(userModel, 'listPendingStudents').mockResolvedValue([]);
  vi.spyOn(userModel, 'listAllUsers').mockResolvedValue([]);
  vi.spyOn(userModel, 'getProfileById').mockResolvedValue([]);
  vi.spyOn(userModel, 'findStudentBasicInfo').mockResolvedValue([]);
  vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);
  vi.spyOn(userModel, 'findProfilePictureById').mockResolvedValue([{ profile_picture: null }]);

  vi.spyOn(userModel, 'getLoginSecurity').mockResolvedValue([]);
  vi.spyOn(userModel, 'incrementFailedLogin').mockResolvedValue([]);
  vi.spyOn(userModel, 'lockAccount').mockResolvedValue([]);
  vi.spyOn(userModel, 'resetLoginSecurity').mockResolvedValue([]);
  vi.spyOn(userModel, 'getPasswordHistory').mockResolvedValue([]);
  vi.spyOn(userModel, 'addPasswordHistory').mockResolvedValue([]);

  vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([]);

  vi.spyOn(userModel, 'updateEmailOTP').mockResolvedValue([]);
  vi.spyOn(userModel, 'clearEmailOTP').mockResolvedValue([]);
  vi.spyOn(userModel, 'requestEmailChange').mockResolvedValue([]);
  vi.spyOn(userModel, 'commitEmailChange').mockResolvedValue([]);
  vi.spyOn(userModel, 'incrementTokenVersion').mockResolvedValue([]);



  vi.spyOn(notificationModel, 'findByUserId').mockResolvedValue([]);
  vi.spyOn(notificationModel, 'markAllRead').mockResolvedValue([{}]);
  vi.spyOn(aiEngine, 'verifyIdDocument').mockResolvedValue(null);
});

describe('login', () => {
  it('uses the enrolled app instead of sending an email code', async () => {
    const user = { ...verifiedStudent(), is_active: 1, token_version: 0 };
    userModel.findActiveByStudentId.mockResolvedValue([user]);
    authenticator.isEnabled.mockResolvedValue(true);
    vi.spyOn(authenticator, 'challenge').mockResolvedValue({ requires_2fa: true, mfa_method: 'authenticator' });
    expect(await service.login({ employee_id: 'STU-001', password: 'Trace2024!' })).toHaveProperty('mfa_method', 'authenticator');
    expect(userModel.updateEmailOTP).not.toHaveBeenCalled();
  });
  it('never lets an old email challenge bypass a newly enrolled authenticator', async () => {
    const user = { ...verifiedStudent(), is_active: 1, token_version: 0, login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000) };
    vi.spyOn(userModel, 'findById').mockResolvedValue([user]);
    authenticator.isEnabled.mockResolvedValue(true);
    const token = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    await expect(service.verify2FA(token, '123456')).rejects.toThrow('method changed');
    expect(userModel.clearEmailOTP).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    userModel.getLoginSecurity.mockResolvedValue([{ id: 1, failed_login_attempts: 0, locked_until: null }]);
  });
  it('requires both an ID and a password', async () => {
    expect(await statusOf(service.login({}))).toBe(400);
    expect(await statusOf(service.login({ employee_id: 'X' }))).toBe(400);
  });

  it('401s for an unknown account', async () => {
    expect(await statusOf(service.login({ employee_id: 'NOPE', password: 'x' }))).toBe(401);
  });

  it('401s for a wrong password', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    expect(await statusOf(service.login({ employee_id: 'STU-001', password: 'WrongPassword1!' }))).toBe(401);
  });

  it.each(['pending', 'rejected'])('blocks a student whose account is %s', async (verification_status) => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...verifiedStudent(), verification_status }]);
    expect(await statusOf(service.login({ employee_id: 'STU-001', password: 'Trace2024!' }))).toBe(403);
  });

  it('lets staff in regardless of verification status', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([
      { ...verifiedStudent(), role: 'clerk', email: 'synthetic@example.test', desk_assignment: 'Finance', verification_status: 'pending' },
    ]);
    await expect(service.login({ employee_id: 'FIN', password: 'Trace2024!' })).resolves.toHaveProperty('requires_2fa', true);
  });

  it('issues a JWT carrying the role and desk, and never the password hash', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    const res = await service.login({ employee_id: 'STU-001', password: 'Trace2024!' });

    const decoded = jwt.verify(res.token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: 3, role: 'student', course: 'CCS' });
    expect(JSON.stringify(res)).not.toContain(passwordHash);
    expect(res.user).not.toHaveProperty('password_hash');
  });

  it('carries user_type through to the returned user object, so the frontend can tell alumni apart from students', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...verifiedStudent(), user_type: 'alumni' }]);
    const res = await service.login({ employee_id: 'STU-001', password: 'Trace2024!' });
    expect(res.user.user_type).toBe('alumni');
  });

  it('rejects a token signed with the wrong secret', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    const { token } = await service.login({ employee_id: 'STU-001', password: 'Trace2024!' });
    expect(() => jwt.verify(token, 'some-other-secret')).toThrow();
  });
});

describe.each(['student password', 'staff OTP'])('%s session versions', (flow) => {
  const issueToken = async (version) => {
    const user = { ...verifiedStudent(), token_version: version, is_active: 1 };
    if (flow === 'staff OTP') {
      const staff = { ...user, role: 'admin', login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000) };
      vi.spyOn(userModel, 'findById').mockResolvedValue([staff]);
      userModel.getProfileById.mockResolvedValue([staff]);
      const challenge = jwt.sign({ id: user.id, pending_2fa: true, token_version: version }, env.JWT_SECRET);
      return (await service.verify2FA(challenge, '123456')).token;
    }
    userModel.findActiveByStudentId.mockResolvedValue([user]);
    return (await service.login({ employee_id: user.student_id, password: 'Trace2024!' })).token;
  };

  const checkSession = async (token, storedVersion) => {
    vi.spyOn(pool, 'query').mockImplementation(async sql => sql.startsWith('SELECT token_hash') ? [[]] : [[{ token_version: storedVersion, is_active: 1 }]]);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await authenticate(req, res, next);
    return { req, res, next };
  };

  it.each([0, 4])('authenticates a newly issued token at stored version %s', async (version) => {
    const token = await issueToken(version);
    expect(jwt.verify(token, env.JWT_SECRET).token_version).toBe(version);
    const { req, res, next } = await checkSession(token, version);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user.id).toBe(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects the previously issued token after its stored version is incremented', async () => {
    const token = await issueToken(0);
    const { res, next } = await checkSession(token, 1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Session expired. Please log in again.' });
  });
});

describe('clerk MFA browser policy', () => {
  const credentials = { employee_id: 'STAFF001', password: 'Trace2024!' };
  const clerk = () => ({ ...verifiedStudent(), email: 'synthetic@example.test', role: 'clerk', is_active: 1, token_version: 0 });
  const otpUser = () => ({ ...clerk(), login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000) });
  const challenge = (claims = {}) => jwt.sign({ id: 3, pending_2fa: true, token_version: 0, ...claims }, env.JWT_SECRET);

  it('directs an unenrolled clerk with no email to Admin-assisted setup without granting a session or undeliverable OTP', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...clerk(), email: null }]);
    const result = await service.login(credentials);
    expect(result).toEqual({ requires_authenticator_setup: true });
    expect(userModel.updateEmailOTP).not.toHaveBeenCalled();
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it('requires Admin OTP even with personal mode, opt-in and an existing browser cookie', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...clerk(), role: 'admin' }]);
    trustedBrowser.isTrusted.mockResolvedValue(true);
    const result = await service.login({ ...credentials, shared_computer: false }, null, null, 'trace_mfa_trust=synthetic');
    expect(result).toMatchObject({ requires_2fa: true, can_trust_browser: false });
    expect(trustedBrowser.isTrusted).not.toHaveBeenCalled();
    const decoded = jwt.verify(result.temp_token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ token_version: 0, can_trust_browser: false });
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...otpUser(), role: 'admin' }]);
    await service.verify2FA(result.temp_token, '123456', null, null, true);
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it.each([undefined, true, 'false', 0])('requires clerk OTP in default/shared mode %s even with a cookie', async shared_computer => {
    userModel.findActiveByStudentId.mockResolvedValue([clerk()]);
    trustedBrowser.isTrusted.mockResolvedValue(true);
    const result = await service.login({ ...credentials, shared_computer });
    expect(result).toMatchObject({ requires_2fa: true, can_trust_browser: true });
    expect(trustedBrowser.isTrusted).not.toHaveBeenCalled();
  });

  it('skips only clerk OTP after valid password and explicit personal mode', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([clerk()]);
    trustedBrowser.isTrusted.mockResolvedValue(true);
    const result = await service.login({ ...credentials, shared_computer: false }, '127.0.0.1', 'Test', 'cookie-header');
    expect(result.token).toBeDefined();
    expect(jwt.verify(result.token, env.JWT_SECRET).token_version).toBe(0);
    expect(trustedBrowser.isTrusted).toHaveBeenCalledWith(clerk(), 'cookie-header', false);
    expect(userModel.updateEmailOTP).not.toHaveBeenCalled();
  });

  it('a trusted cookie cannot replace the password check', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([clerk()]);
    trustedBrowser.isTrusted.mockResolvedValue(true);
    expect(await statusOf(service.login({ ...credentials, password: 'wrong', shared_computer: false }))).toBe(401);
    expect(trustedBrowser.isTrusted).not.toHaveBeenCalled();
  });

  it.each([false, undefined, 'true'])('does not grant trust without a boolean OTP opt-in (%s)', async choice => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([otpUser()]);
    await service.verify2FA(challenge({ can_trust_browser: true }), '123456', null, null, choice);
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it('rejects attempts to turn a shared challenge into a trusted login', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([otpUser()]);
    await service.verify2FA(challenge({ can_trust_browser: false }), '123456', null, null, true);
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it('grants trust only after valid OTP in signed personal mode', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([otpUser()]);
    trustedBrowser.issue.mockResolvedValue({ value: 'synthetic-cookie', expiresAt: 1000 });
    const result = await service.verify2FA(challenge({ can_trust_browser: true }), '123456', null, null, true);
    expect(trustedBrowser.issue).toHaveBeenCalledExactlyOnceWith(3, 0);
    expect(userModel.clearEmailOTP.mock.invocationCallOrder[0]).toBeLessThan(trustedBrowser.issue.mock.invocationCallOrder[0]);
    expect(result.user).not.toHaveProperty('browserTrust');
    expect(result.browserTrust).toEqual({ value: 'synthetic-cookie', expiresAt: 1000 });
  });

  it.each([undefined, 0])('rejects legacy or revoked pending challenges (%s)', async version => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...otpUser(), token_version: 1 }]);
    const claims = { id: 3, pending_2fa: true, can_trust_browser: true };
    if (version !== undefined) claims.token_version = version;
    expect(await statusOf(service.verify2FA(jwt.sign(claims, env.JWT_SECRET), '123456', null, null, true))).toBe(401);
    expect(userModel.clearEmailOTP).not.toHaveBeenCalled();
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it('does not issue a browser proof on invalid OTP', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([otpUser()]);
    expect(await statusOf(service.verify2FA(challenge({ can_trust_browser: true }), '999999', null, null, true))).toBe(401);
    expect(trustedBrowser.issue).not.toHaveBeenCalled();
  });

  it('keeps student optional 2FA regardless of browser mode or cookies', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...verifiedStudent(), two_factor_enabled: true }]);
    trustedBrowser.isTrusted.mockResolvedValue(true);
    expect(await service.login({ ...credentials, shared_computer: false })).toMatchObject({ requires_2fa: true, can_trust_browser: false });
    expect(trustedBrowser.isTrusted).not.toHaveBeenCalled();
  });
});

describe('credential changes revoke MFA trust and pending challenges', () => {
  const change = () => service.updateProfile(3, { password: 'NewPassword2024!', current_password: 'Trace2024!' });
  beforeEach(() => {
    userModel.getProfileById.mockResolvedValue([{ email: null, student_id: 'STU-001' }]);
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
  });

  it('commits the password, history, account version and OTP clearing together', async () => {
    await change();
    expect(userModel.updateProfile).toHaveBeenCalledWith(3, expect.objectContaining({ password_hash: expect.any(String) }), credentialConnection);
    expect(userModel.incrementTokenVersion).toHaveBeenCalledWith(3, credentialConnection);
    expect(userModel.clearEmailOTP).toHaveBeenCalledWith(3, credentialConnection);
    expect(userModel.addPasswordHistory).toHaveBeenCalledWith(3, expect.any(String), credentialConnection);
    expect(credentialConnection.commit).toHaveBeenCalledOnce();
  });

  it('rolls back a credential change when revocation fails', async () => {
    userModel.incrementTokenVersion.mockRejectedValue(new Error('version write failed'));
    await expect(change()).rejects.toThrow('version write failed');
    expect(credentialConnection.commit).not.toHaveBeenCalled();
    expect(credentialConnection.rollback).toHaveBeenCalledOnce();
    expect(credentialConnection.release).toHaveBeenCalledOnce();
  });

  it('rejects a password changed concurrently after current-password verification', async () => {
    trustedBrowserModel.lockAccount.mockResolvedValue({ id: 3, is_active: 1, password_hash: 'different-hash' });
    expect(await statusOf(change())).toBe(401);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
    expect(userModel.incrementTokenVersion).not.toHaveBeenCalled();
  });

  it('never revokes trust when the current password is incorrect', async () => {
    expect(await statusOf(service.updateProfile(3, { password: 'NewPassword2024!', current_password: 'wrong' }))).toBe(400);
    expect(userModel.incrementTokenVersion).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('logout-all revokes a pending OTP challenge through the same account version', async () => {
    const pending = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    await service.logoutAll(3);
    expect(userModel.incrementTokenVersion).toHaveBeenCalledWith(3);
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...verifiedStudent(), token_version: 1, login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000) }]);
    expect(await statusOf(service.verify2FA(pending, '123456'))).toBe(401);
  });
});

describe('register', () => {
  const body = {
    employee_id: 'STU-NEW', full_name: 'New Student', email: 'new@example.test',
    phone_number: '+639', password: 'Trace2024!', course: 'CCS',
  };
  const file = { path: '/tmp/id.jpg', originalname: 'id.jpg', mimetype: 'image/jpeg' };

  it('stores the separate program without replacing college assignment', async () => {
    await service.register({ ...body, program: ' BS Information Technology ' }, file);
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ program: 'BS Information Technology', course: 'CCS' }));
  });
  it('rejects an oversized program before account creation', async () => {
    await expect(service.register({ ...body, program: 'x'.repeat(151) }, file)).rejects.toMatchObject({ status: 400 });
    expect(userModel.createUser).not.toHaveBeenCalled();
  });

  it('requires the mandatory fields and an ID proof', async () => {
    expect(await statusOf(service.register({}, file))).toBe(400);
    expect(await statusOf(service.register(body, null))).toBe(400);
  });

  it('refuses an ID that is already registered', async () => {
    userModel.findExistingByStudentId.mockResolvedValue([{ id: 1, verification_status: 'verified' }]);
    expect(await statusOf(service.register(body, file))).toBe(400);
  });

  it('lets a rejected applicant re-register, clearing the old row first', async () => {
    userModel.findExistingByStudentId.mockResolvedValue([{ id: 12, verification_status: 'rejected' }]);
    await service.register(body, file);
    expect(userModel.deleteById).toHaveBeenCalledWith(12);
    expect(userModel.createUser).toHaveBeenCalled();
  });

  it('auto-verifies when the AI confirms the ID', async () => {
    aiEngine.verifyIdDocument.mockResolvedValue({ verified: true, reason: 'matched' });
    const res = await service.register(body, file);
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ verification_status: 'verified' }));
    expect(res.message).toMatch(/automatically verified/i);
  });

  it('leaves the account pending when the AI cannot confirm', async () => {
    aiEngine.verifyIdDocument.mockResolvedValue({ verified: false, reason: 'no match' });
    const res = await service.register(body, file);
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ verification_status: 'pending' }));
    expect(res.message).toMatch(/administrator verification/i);
  });

  it('leaves the account pending when the AI engine is unreachable', async () => {
    aiEngine.verifyIdDocument.mockResolvedValue(null);
    await service.register(body, file);
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ verification_status: 'pending' }));
  });

  it('stores and returns a review reason without calling a genuine but unreadable proof fake', async () => {
    aiEngine.verifyIdDocument.mockResolvedValue({ verified: false, reason: 'School name and Student ID found, but College did not match.' });
    const result = await service.register(body, file);
    expect(result.verification_reason).toContain('could not confirm the selected college');
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ verification_status: 'pending', verification_reason: result.verification_reason }));
    expect(result.verification_reason).not.toMatch(/fake|fraud|counterfeit|rejected/);
  });

  it('stores a bcrypt hash, never the raw password', async () => {
    await service.register(body, file);
    const stored = userModel.createUser.mock.calls[0][0].password_hash;
    expect(stored).not.toBe('pw');
    expect(await bcrypt.compare('Trace2024!', stored)).toBe(true);
  });
});

describe('admin-only guards', () => {
  const ADMIN = { id: 7, role: 'admin' };
  const STUDENT = { id: 3, role: 'student' };
  const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };

  it.each([['a student', STUDENT], ['a clerk', CLERK]])('listPendingStudents rejects %s', async (_l, u) => {
    expect(await statusOf(service.listPendingStudents(u))).toBe(403);
  });

  it.each([['a student', STUDENT], ['a clerk', CLERK]])('listAllUsers rejects %s', async (_l, u) => {
    expect(await statusOf(service.listAllUsers(u))).toBe(403);
  });

  it.each([['a student', STUDENT], ['a clerk', CLERK]])('verifyStudentAccount rejects %s', async (_l, u) => {
    expect(await statusOf(service.verifyStudentAccount(u, 3, 'verify'))).toBe(403);
  });

  it('allows an admin through', async () => {
    await expect(service.listPendingStudents(ADMIN)).resolves.toHaveProperty('pending_students');
    await expect(service.listAllUsers(ADMIN)).resolves.toHaveProperty('users');
  });

  it('rejects an unknown verification action', async () => {
    expect(await statusOf(service.verifyStudentAccount(ADMIN, 3, 'maybe'))).toBe(400);
  });

  it.each([['verify', 'verified'], ['reject', 'rejected']])('maps %s to %s', async (action, expected) => {
    await service.verifyStudentAccount(ADMIN, 3, action);
    expect(userModel.setVerificationStatus).toHaveBeenCalledWith(3, expected);
  });

  it('404s when the target student does not exist', async () => {
    userModel.setVerificationStatus.mockResolvedValue([{ affectedRows: 0 }]);
    expect(await statusOf(service.verifyStudentAccount(ADMIN, 999, 'verify'))).toBe(404);
  });
});

describe('updateProfile', () => {
  beforeEach(() => { notificationModel.notifyByEmail = vi.fn(); });

  beforeEach(() => {
    userModel.getProfileById.mockResolvedValue([{ email: 'old@plp.edu.ph', student_id: 'STU-1' }]);
    userModel.findActiveByStudentId.mockResolvedValue([{ password_hash: passwordHash }]);
    userModel.getPasswordHistory.mockResolvedValue([]);
    userModel.addPasswordHistory.mockResolvedValue(true);
  });
  it('rejects an update with no fields', async () => {
    userModel.updateProfile.mockResolvedValue(false);
    expect(await statusOf(service.updateProfile(3, {}))).toBe(400);
  });

  it('hashes a new password rather than storing it raw', async () => {
    await service.updateProfile(3, { password: 'NewPassword2024!', current_password: 'Trace2024!' });
    const fields = userModel.updateProfile.mock.calls[0][1];
    expect(fields.password_hash).toBeDefined();
    expect(fields.password_hash).not.toBe('newpw');
    expect(fields).not.toHaveProperty('password');
  });

  it('only writes the fields actually supplied', async () => {
    await service.updateProfile(3, { phone_number: '+63999' });
    expect(userModel.updateProfile.mock.calls[0][1]).toEqual({ phone_number: '+63999' });
  });
});

describe('updateProfilePicture', () => {
  it('rejects a request that carried no image', async () => {
    expect(await statusOf(service.updateProfilePicture(3, undefined))).toBe(400);
  });

  it('stores only the filename, never a client-supplied path', async () => {
    const result = await service.updateProfilePicture(3, { filename: 'avatar-123-ab.png' });
    expect(userModel.updateProfile).toHaveBeenCalledWith(3, { profile_picture: 'avatar-123-ab.png' });
    expect(result.profile_picture).toBe('avatar-123-ab.png');
  });

  it('removes the previous avatar so uploads do not pile up on disk', async () => {
    userModel.findProfilePictureById.mockResolvedValue([{ profile_picture: 'avatar-old.png' }]);
    const unlink = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    await service.updateProfilePicture(3, { filename: 'avatar-new.png' });
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(unlink.mock.calls[0][0]).toContain('avatar-old.png');
  });

  it('still succeeds when the old file is already gone', async () => {
    userModel.findProfilePictureById.mockResolvedValue([{ profile_picture: 'avatar-missing.png' }]);
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const result = await service.updateProfilePicture(3, { filename: 'avatar-new.png' });
    expect(result.profile_picture).toBe('avatar-new.png');
  });

  it('does not delete anything when the account had no avatar yet', async () => {
    const unlink = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    await service.updateProfilePicture(3, { filename: 'avatar-first.png' });
    expect(unlink).not.toHaveBeenCalled();
  });
});


describe('Batch 8 OTP completion', () => {
  it('returns public user fields after staff OTP and never caches secrets', async () => {
    const user = { ...verifiedStudent(), role: 'clerk', is_active: 1, login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000) };
    vi.spyOn(userModel, 'findById').mockResolvedValue([user]);
    userModel.getProfileById.mockResolvedValue([{ ...user, has_grad_application: 1 }]);
    const token = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    const result = await service.verify2FA(token, '123456');
    expect(result.user.has_grad_application).toBe(true);
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user).not.toHaveProperty('email_otp');
    expect(result.user).not.toHaveProperty('login_otp');
  });
  it('rejects obsolete email codes after moving verification to links', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 3, pending_email: 'new@example.com', email_otp: 'E:123456', email_otp_expires: new Date(Date.now() + 60000) }]);
    expect(await statusOf(service.verifyEmailChange(3, '999999'))).toBe(400);
    expect(userModel.commitEmailChange).not.toHaveBeenCalled();
    expect(await statusOf(service.verifyEmailChange(3, '123456'))).toBe(400);
    expect(userModel.commitEmailChange).not.toHaveBeenCalled();
  });
  it('rejects expired OTPs and inactive users', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...verifiedStudent(), is_active: 0 }]);
    const token = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    expect(await statusOf(service.verify2FA(token, '123456'))).toBe(404);
  });
});

describe('purpose-bound OTP challenges', () => {
  it('stages email changes with a link and leaves the current address untouched', async () => {
    userModel.getProfileById.mockResolvedValue([{ id: 3, student_id: 'STU-001', email: 'old@example.test' }]);
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    const result = await service.updateProfile(3, { email: 'new@example.test', current_password: 'Trace2024!' });
    expect(result).toMatchObject({ email_verification_required: true, pending_email: 'new@example.test' });
    expect(emailVerification.issue).toHaveBeenCalledWith(3, { email: 'new@example.test', current_password: 'Trace2024!' });
    expect(userModel.requestEmailChange).not.toHaveBeenCalled();
    expect(userModel.commitEmailChange).not.toHaveBeenCalled();
  });
  it('a login code cannot commit a pending email, even when its value matches', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 3, pending_email: 'new@example.test', login_otp: '123456', login_otp_expires: new Date(Date.now() + 60000), email_otp: 'E:654321', email_otp_expires: new Date(Date.now() + 60000) }]);
    expect(await statusOf(service.verifyEmailChange(3, '123456'))).toBe(400);
    expect(userModel.commitEmailChange).not.toHaveBeenCalled();
  });
  it('a legacy shared OTP is not accepted as proof of a new email address', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 3, pending_email: 'new@example.test', email_otp: '123456', email_otp_expires: new Date(Date.now() + 60000) }]);
    expect(await statusOf(service.verifyEmailChange(3, '123456'))).toBe(400);
    expect(userModel.commitEmailChange).not.toHaveBeenCalled();
  });
  it('an email-change code cannot finish staff login', async () => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...verifiedStudent(), role: 'clerk', is_active: 1, email_otp: 'E:123456', email_otp_expires: new Date(Date.now() + 60000), login_otp: '654321', login_otp_expires: new Date(Date.now() + 60000) }]);
    const token = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    expect(await statusOf(service.verify2FA(token, '123456'))).toBe(401);
    expect(userModel.clearEmailOTP).not.toHaveBeenCalled();
  });
  it.each([null, 'invalid', new Date(Date.now() - 60000)])('rejects missing, invalid, and expired login expiry (%s)', async expires => {
    vi.spyOn(userModel, 'findById').mockResolvedValue([{ ...verifiedStudent(), role: 'clerk', is_active: 1, login_otp: '123456', login_otp_expires: expires }]);
    const token = jwt.sign({ id: 3, pending_2fa: true, token_version: 0 }, env.JWT_SECRET);
    expect(await statusOf(service.verify2FA(token, '123456'))).toBe(400);
  });
});

describe('Batch 8b identity and staff profile boundary', () => {
  it('projects personal/educational fields explicitly without authentication secrets', async () => {
    userModel.findStudentBasicInfo.mockRestore();
    const executor = { query: vi.fn().mockResolvedValue([[]]) };
    await userModel.findStudentBasicInfo('STU1', executor);
    const [sql, values] = executor.query.mock.calls[0];
    expect(sql).toContain('p.home_address');
    expect(sql).toContain('p.shs_school');
    expect(sql).toContain('u.id_proof_path');
    expect(sql).not.toMatch(/SELECT\s+\*|password|otp|token_version|failed_login/i);
    expect(values).toEqual(['STU1']);
  });
  it('stores the submitted Alumni ID and explicit college without rewriting existing identifiers', async () => {
    await service.register({ employee_id: 'ALU1234567', email: 'alumni@example.test', user_type: 'alumni', full_name: 'Ana Reyes', phone_number: '09123456789', password: 'Trace2024!', college_id: '2' }, { path: '/proof.png' });
    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({ student_id: 'ALU1234567', user_type: 'alumni', college_id: 2, course: 'College A' }));
  });
  it('rejects student and unknown desk access before querying another profile', async () => {
    await expect(service.lookupStudent('STU1', { role: 'student' })).rejects.toMatchObject({ status: 403 });
    await expect(service.lookupStudent('STU1', { role: 'clerk', desk_assignment: 'Unknown' })).rejects.toMatchObject({ status: 403 });
    expect(userModel.findStudentBasicInfo).not.toHaveBeenCalled();
  });
  it.each(['Window 1', 'Secretary', 'Finance'])('allows the %s desk to read a saved profile', async desk => {
    userModel.findStudentBasicInfo.mockResolvedValue([{ role: 'student', phone_number: '0912', home_address: 'Saved address' }]);
    expect(await service.lookupStudent('STU1', { role: 'clerk', desk_assignment: desk })).toMatchObject({ student: { home_address: 'Saved address' } });
  });
});

describe('server-side logout', () => {
  it('revokes only the current token and commits its audit before reporting success', async () => {
    const sessions = require('../../models/session.model');
    vi.spyOn(sessions, 'revoke').mockResolvedValue([{}]);
    await expect(service.logout({ id: 3, session_hash: 'a'.repeat(64), expires_at: 1800000000 })).resolves.toMatchObject({ message: 'Session ended.' });
    expect(sessions.revoke).toHaveBeenCalledWith(3, 'a'.repeat(64), 1800000000, credentialConnection);
    expect(userModel.incrementTokenVersion).not.toHaveBeenCalled();
    expect(credentialConnection.commit).toHaveBeenCalledOnce();
    expect(userModel.logSecurityEvent).toHaveBeenCalledWith(3, 'LOGOUT', null, null, credentialConnection);
  });
  it('rolls back a failed logout audit so it cannot return a false success', async () => {
    const sessions = require('../../models/session.model');
    vi.spyOn(sessions, 'revoke').mockResolvedValue([{}]);
    userModel.logSecurityEvent.mockRejectedValue(new Error('Audit failed'));
    await expect(service.logout({ id: 3, session_hash: 'a'.repeat(64), expires_at: 1800000000 })).rejects.toThrow('Audit failed');
    expect(credentialConnection.rollback).toHaveBeenCalledOnce();
    expect(credentialConnection.commit).not.toHaveBeenCalled();
  });
  it('logs out other devices while replacing the current session with the new version', async () => {
    userModel.getProfileById.mockResolvedValue([{ ...verifiedStudent(), is_active: 1 }]);
    const result = await service.logoutAll(3, true, 0);
    expect(jwt.verify(result.token, env.JWT_SECRET).token_version).toBe(1);
    expect(userModel.incrementTokenVersion).toHaveBeenCalledWith(3, credentialConnection);
    expect(credentialConnection.commit).toHaveBeenCalledOnce();
  });
  it('does not let an old session obtain a replacement after revocation', async () => {
    await expect(service.logoutAll(3, true, 4)).rejects.toMatchObject({ status: 401 });
    expect(userModel.incrementTokenVersion).not.toHaveBeenCalled();
  });
});
