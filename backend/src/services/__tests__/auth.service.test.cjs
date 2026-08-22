/**
 * Login gating, registration behaviour, and the admin-only guards.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../../models/user.model');
const notificationModel = require('../../models/notification.model');
const aiEngine = require('../aiEngine.service');
const env = require('../../config/env');
const service = require('../auth.service');

const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

let passwordHash;

beforeAll(async () => {
  passwordHash = await bcrypt.hash('trace2024', 10);
});

const verifiedStudent = () => ({
  id: 3,
  student_id: 'STU-001',
  full_name: 'Ana Reyes',
  role: 'student',
  desk_assignment: null,
  course: 'CCS',
  verification_status: 'verified',
  password_hash: passwordHash,
});

beforeEach(() => {
  vi.spyOn(userModel, 'findActiveByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'findExistingByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'createUser').mockResolvedValue([{ insertId: 1 }]);
  vi.spyOn(userModel, 'deleteById').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(userModel, 'setVerificationStatus').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(userModel, 'listPendingStudents').mockResolvedValue([]);
  vi.spyOn(userModel, 'listAllUsers').mockResolvedValue([]);
  vi.spyOn(userModel, 'getProfileById').mockResolvedValue([]);
  vi.spyOn(userModel, 'findStudentBasicInfo').mockResolvedValue([]);
  vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);
  vi.spyOn(notificationModel, 'findByUserId').mockResolvedValue([]);
  vi.spyOn(notificationModel, 'markAllRead').mockResolvedValue([{}]);
  vi.spyOn(aiEngine, 'verifyIdDocument').mockResolvedValue(null);
});

describe('login', () => {
  it('requires both an ID and a password', async () => {
    expect(await statusOf(service.login({}))).toBe(400);
    expect(await statusOf(service.login({ employee_id: 'X' }))).toBe(400);
  });

  it('401s for an unknown account', async () => {
    expect(await statusOf(service.login({ employee_id: 'NOPE', password: 'x' }))).toBe(401);
  });

  it('401s for a wrong password', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    expect(await statusOf(service.login({ employee_id: 'STU-001', password: 'wrong' }))).toBe(401);
  });

  it.each(['pending', 'rejected'])('blocks a student whose account is %s', async (verification_status) => {
    userModel.findActiveByStudentId.mockResolvedValue([{ ...verifiedStudent(), verification_status }]);
    expect(await statusOf(service.login({ employee_id: 'STU-001', password: 'trace2024' }))).toBe(403);
  });

  it('lets staff in regardless of verification status', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([
      { ...verifiedStudent(), role: 'clerk', desk_assignment: 'Finance', verification_status: 'pending' },
    ]);
    await expect(service.login({ employee_id: 'FIN', password: 'trace2024' })).resolves.toHaveProperty('token');
  });

  it('issues a JWT carrying the role and desk, and never the password hash', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    const res = await service.login({ employee_id: 'STU-001', password: 'trace2024' });

    const decoded = jwt.verify(res.token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: 3, role: 'student', course: 'CCS' });
    expect(JSON.stringify(res)).not.toContain(passwordHash);
    expect(res.user).not.toHaveProperty('password_hash');
  });

  it('rejects a token signed with the wrong secret', async () => {
    userModel.findActiveByStudentId.mockResolvedValue([verifiedStudent()]);
    const { token } = await service.login({ employee_id: 'STU-001', password: 'trace2024' });
    expect(() => jwt.verify(token, 'some-other-secret')).toThrow();
  });
});

describe('register', () => {
  const body = {
    employee_id: 'STU-NEW', full_name: 'New Student',
    phone_number: '+639', password: 'pw', course: 'CCS',
  };
  const file = { path: '/tmp/id.jpg', originalname: 'id.jpg', mimetype: 'image/jpeg' };

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

  it('stores a bcrypt hash, never the raw password', async () => {
    await service.register(body, file);
    const stored = userModel.createUser.mock.calls[0][0].password_hash;
    expect(stored).not.toBe('pw');
    expect(await bcrypt.compare('pw', stored)).toBe(true);
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
  it('rejects an update with no fields', async () => {
    userModel.updateProfile.mockResolvedValue(false);
    expect(await statusOf(service.updateProfile(3, {}))).toBe(400);
  });

  it('hashes a new password rather than storing it raw', async () => {
    await service.updateProfile(3, { password: 'newpw' });
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
