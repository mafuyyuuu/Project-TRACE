/**
 * Admin maintenance CRUD.
 *
 * Two invariants matter most here: only admins get in, and "delete" never
 * actually deletes — historical documents reference document types by name and
 * users reference colleges by name.
 */
const bcrypt = require('bcryptjs');
const referenceModel = require('../../models/referenceData.model');
const userModel = require('../../models/user.model');
const pricingModel = require('../../models/pricing.model');
const service = require('../maintenance.service');
const { pool } = require('../../config/db');

const ADMIN = { id: 7, role: 'admin' };
const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };
const STUDENT = { id: 3, role: 'student' };

const statusOf = (p) => p.then(() => undefined, (e) => e.status);
const messageOf = (p) => p.then(() => '', (e) => e.message);

describe('document policy transaction', () => {
  it('saves audience and college restrictions together only after Admin authorization', async () => {
    const connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
    vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
    vi.spyOn(referenceModel, 'setDocumentTypeColleges').mockResolvedValue([]);
    await service.updateDocumentType(ADMIN, 1, { available_to: 'alumni', is_repeatable: false, allowed_college_ids: [1, 1] });
    expect(referenceModel.updateDocumentType).toHaveBeenCalledWith(1,
      expect.objectContaining({ available_to: 'alumni', is_repeatable: true, allowed_college_ids: [1] }), connection);
    expect(referenceModel.setDocumentTypeColleges).toHaveBeenCalledWith(1, [1], connection);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(await statusOf(service.updateDocumentType(STUDENT, 1, { available_to: 'both' }))).toBe(403);
  });

  it('rolls back the settings when saving the college restrictions fails', async () => {
    const connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
    vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
    vi.spyOn(referenceModel, 'setDocumentTypeColleges').mockRejectedValue(new Error('junction failure'));
    await expect(service.updateDocumentType(ADMIN, 1, { allowed_college_ids: [1] })).rejects.toThrow('junction failure');
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('rejects guessed college IDs and enforces the Honorable Dismissal exception', async () => {
    referenceModel.findCollegeById.mockResolvedValue([]);
    expect(await statusOf(service.updateDocumentType(ADMIN, 1, { allowed_college_ids: [999] }))).toBe(400);
    referenceModel.findDocumentTypeById.mockResolvedValue([{ id: 1, name: 'Honorable Dismissal' }]);
    await service.updateDocumentType(ADMIN, 1, { is_repeatable: true });
    expect(referenceModel.updateDocumentType).toHaveBeenCalledWith(1, expect.objectContaining({ is_repeatable: false }));
  });
});

beforeEach(() => {
  vi.spyOn(pool, 'getConnection').mockResolvedValue({ beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() });
  vi.spyOn(require('../../models/trustedBrowser.model'), 'lockAccount').mockResolvedValue({ id: 5, role: 'clerk', is_active: 1 });
  vi.spyOn(userModel, 'incrementTokenVersion').mockResolvedValue([]);
  vi.spyOn(userModel, 'clearEmailOTP').mockResolvedValue([]);
  vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([]);
  vi.spyOn(pricingModel, 'attachSchedules').mockImplementation(async types => types);
  vi.spyOn(referenceModel, 'listColleges').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findCollegeByName').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findCollegeById').mockResolvedValue([{ id: 1, name: 'CCS' }]);
  vi.spyOn(referenceModel, 'createCollege').mockResolvedValue([{ insertId: 9 }]);
  vi.spyOn(referenceModel, 'updateCollege').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(referenceModel, 'setCollegeActive').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(referenceModel, 'countUsersInCollege').mockResolvedValue(0);

  vi.spyOn(referenceModel, 'listDocumentTypes').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findDocumentTypeByName').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findDocumentTypeById').mockResolvedValue([{ id: 1, name: 'Diploma' }]);
  vi.spyOn(referenceModel, 'createDocumentType').mockResolvedValue([{ insertId: 9 }]);
  vi.spyOn(referenceModel, 'updateDocumentType').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(referenceModel, 'setDocumentTypeActive').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(referenceModel, 'countDocumentsUsingType').mockResolvedValue(0);

  vi.spyOn(referenceModel, 'listPaymentMethods').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findPaymentMethodByCode').mockResolvedValue([]);
  vi.spyOn(referenceModel, 'findPaymentMethodById').mockResolvedValue([{ id: 1, code: 'gcash' }]);
  vi.spyOn(referenceModel, 'createPaymentMethod').mockResolvedValue([{ insertId: 9 }]);
  vi.spyOn(referenceModel, 'updatePaymentMethod').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(referenceModel, 'setPaymentMethodActive').mockResolvedValue([{ affectedRows: 1 }]);

  vi.spyOn(userModel, 'listStaff').mockResolvedValue([]);
  vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 5, role: 'clerk' }]);
  vi.spyOn(userModel, 'findExistingByStudentId').mockResolvedValue([]);
  vi.spyOn(userModel, 'createStaff').mockResolvedValue([{ insertId: 21 }]);
  vi.spyOn(userModel, 'updateStaff').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(userModel, 'setUserActive').mockResolvedValue([{ affectedRows: 1 }]);
});

describe('admin-only access', () => {
  const calls = {
    listColleges: (u) => service.listColleges(u),
    createCollege: (u) => service.createCollege(u, { name: 'X' }),
    setCollegeActive: (u) => service.setCollegeActive(u, 1, false),
    listDocumentTypes: (u) => service.listDocumentTypes(u),
    createDocumentType: (u) => service.createDocumentType(u, { name: 'X' }),
    listStaff: (u) => service.listStaff(u),
    createStaff: (u) => service.createStaff(u, { employee_id: 'X' }),
    setStaffActive: (u) => service.setStaffActive(u, 5, false),
    listPaymentMethods: (u) => service.listPaymentMethods(u),
    createPaymentMethod: (u) => service.createPaymentMethod(u, { code: 'x', name: 'X' }),
    setPaymentMethodActive: (u) => service.setPaymentMethodActive(u, 1, false),
  };

  it.each(Object.keys(calls))('%s rejects a clerk', async (name) => {
    expect(await statusOf(calls[name](CLERK))).toBe(403);
  });

  it.each(Object.keys(calls))('%s rejects a student', async (name) => {
    expect(await statusOf(calls[name](STUDENT))).toBe(403);
  });
});

describe('colleges', () => {
  it('creates one and trims the name', async () => {
    await service.createCollege(ADMIN, { name: '  College of Law  ' });
    expect(referenceModel.createCollege).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'College of Law' })
    );
  });

  it('rejects an empty name', async () => {
    expect(await statusOf(service.createCollege(ADMIN, { name: '   ' }))).toBe(400);
  });

  it('rejects a duplicate', async () => {
    referenceModel.findCollegeByName.mockResolvedValue([{ id: 1 }]);
    expect(await messageOf(service.createCollege(ADMIN, { name: 'CCS' }))).toMatch(/already exists/i);
  });

  it('404s when updating one that does not exist', async () => {
    referenceModel.findCollegeById.mockResolvedValue([]);
    expect(await statusOf(service.updateCollege(ADMIN, 99, { name: 'X' }))).toBe(404);
  });

  it('deactivates rather than deletes, and reports the impact', async () => {
    referenceModel.countUsersInCollege.mockResolvedValue(42);
    const res = await service.setCollegeActive(ADMIN, 1, false);
    expect(referenceModel.setCollegeActive).toHaveBeenCalledWith(1, false);
    expect(res.affected_users).toBe(42);
    expect(res.message).toMatch(/deactivated/i);
  });

  it('can restore a deactivated college', async () => {
    const res = await service.setCollegeActive(ADMIN, 1, true);
    expect(referenceModel.setCollegeActive).toHaveBeenCalledWith(1, true);
    expect(res.message).toMatch(/restored/i);
  });
});

describe('document types', () => {
  it('creates one with a validated fee', async () => {
    await service.createDocumentType(ADMIN, { name: 'Certification', base_fee: 75 });
    expect(referenceModel.createDocumentType).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Certification', base_fee: 75 })
    );
  });

  it.each([[-1], ['abc']])('rejects an invalid base fee (%s)', async (fee) => {
    expect(await statusOf(service.createDocumentType(ADMIN, { name: 'X', base_fee: fee }))).toBe(400);
  });

  it('rejects an unknown fee rule', async () => {
    expect(await statusOf(service.createDocumentType(ADMIN, { name: 'X', fee_rule: 'magic' }))).toBe(400);
  });

  it('accepts both supported fee rules', async () => {
    await expect(service.createDocumentType(ADMIN, { name: 'A', fee_rule: 'flat' })).resolves.toBeTruthy();
    await expect(service.createDocumentType(ADMIN, { name: 'B', fee_rule: 'per_semester_block' })).resolves.toBeTruthy();
  });

  it('refuses to rename a type that existing documents reference', async () => {
    referenceModel.countDocumentsUsingType.mockResolvedValue(37);
    const msg = await messageOf(service.updateDocumentType(ADMIN, 1, { name: 'Renamed' }));
    expect(msg).toMatch(/37 existing document/);
    expect(referenceModel.updateDocumentType).not.toHaveBeenCalled();
  });

  it('allows a rename when nothing references it', async () => {
    referenceModel.countDocumentsUsingType.mockResolvedValue(0);
    await expect(service.updateDocumentType(ADMIN, 1, { name: 'Renamed' })).resolves.toBeTruthy();
  });

  it('allows a fee change even when documents reference it', async () => {
    referenceModel.countDocumentsUsingType.mockResolvedValue(37);
    await expect(service.updateDocumentType(ADMIN, 1, { base_fee: 120 })).resolves.toBeTruthy();
  });

  it('deactivating explains that existing requests are unaffected', async () => {
    referenceModel.countDocumentsUsingType.mockResolvedValue(12);
    const res = await service.setDocumentTypeActive(ADMIN, 1, false);
    expect(res.affected_documents).toBe(12);
    expect(res.message).toMatch(/unaffected/i);
  });
});

describe('registrar catalog retirement and Diploma defaults', () => {
  it.each(['Certificate of Good Moral', 'Certificate of Good Moral Character', '  good moral certificate  '])('rejects creation or restoration of %s', async name => {
    referenceModel.findDocumentTypeById.mockResolvedValue([{ id: 1, name }]);
    await expect(service.createDocumentType(ADMIN, { name, base_fee: 50 })).rejects.toThrow(/no longer available/);
    await expect(service.setDocumentTypeActive(ADMIN, 1, true)).rejects.toThrow(/no longer available/);
    expect(referenceModel.createDocumentType).not.toHaveBeenCalled();
    expect(referenceModel.setDocumentTypeActive).not.toHaveBeenCalled();
  });

  it('prevents renaming a retired type or turning another type into it', async () => {
    referenceModel.findDocumentTypeById.mockResolvedValue([{ id: 1, name: 'Certificate of Good Moral' }]);
    await expect(service.updateDocumentType(ADMIN, 1, { name: 'Replacement' })).rejects.toThrow(/no longer available/);
    referenceModel.findDocumentTypeById.mockResolvedValue([{ id: 1, name: 'Diploma' }]);
    await expect(service.updateDocumentType(ADMIN, 1, { name: 'Good Moral Certificate' })).rejects.toThrow(/no longer available/);
    expect(referenceModel.updateDocumentType).not.toHaveBeenCalled();
  });

  it('marks retired types inactive for Admin without removing the historical catalog entry', async () => {
    referenceModel.listDocumentTypes.mockResolvedValue([{ id: 1, name: 'Certificate of Good Moral', is_active: 1 },
      { id: 2, name: 'Diploma', is_active: 1, base_fee: 325 }]);
    const { document_types } = await service.listDocumentTypes(ADMIN);
    expect(document_types[0]).toMatchObject({ id: 1, is_active: false, is_retired: true });
    expect(document_types[1]).toMatchObject({ base_fee: 325, is_active: 1, is_retired: false });
  });

  it('defaults a new Diploma to 250 and retains explicit Admin fees', async () => {
    await service.createDocumentType(ADMIN, { name: 'Diploma' });
    expect(referenceModel.createDocumentType).toHaveBeenLastCalledWith(expect.objectContaining({ base_fee: 250 }));
    await service.createDocumentType(ADMIN, { name: 'Diploma', base_fee: 325 });
    expect(referenceModel.createDocumentType).toHaveBeenLastCalledWith(expect.objectContaining({ base_fee: 325 }));
    referenceModel.findDocumentTypeById.mockResolvedValue([{ id: 1, name: 'Diploma' }]);
    await service.updateDocumentType(ADMIN, 1, { base_fee: 50 });
    expect(referenceModel.updateDocumentType).toHaveBeenLastCalledWith(1, expect.objectContaining({ base_fee: 50 }));
  });
});

describe('payment methods', () => {
  it('creates one, lowercasing and trimming the code', async () => {
    await service.createPaymentMethod(ADMIN, { code: '  Card  ', name: 'Credit / Debit Card' });
    expect(referenceModel.createPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'card', name: 'Credit / Debit Card', provider: 'manual' })
    );
  });

  it.each(['1card', 'Card Payment', 'card-payment', ''])('rejects an invalid code (%s)', async (code) => {
    expect(await statusOf(service.createPaymentMethod(ADMIN, { code, name: 'X' }))).toBe(400);
  });

  it('rejects a duplicate code', async () => {
    referenceModel.findPaymentMethodByCode.mockResolvedValue([{ id: 2, code: 'gcash' }]);
    const msg = await messageOf(service.createPaymentMethod(ADMIN, { code: 'gcash', name: 'GCash' }));
    expect(msg).toMatch(/already exists/i);
    expect(referenceModel.createPaymentMethod).not.toHaveBeenCalled();
  });

  it('rejects an unregistered provider on create', async () => {
    const msg = await messageOf(
      service.createPaymentMethod(ADMIN, { code: 'paypal', name: 'PayPal', provider: 'paypal' })
    );
    expect(msg).toMatch(/unknown payment provider/i);
  });

  it('rejects an unregistered provider on update', async () => {
    const msg = await messageOf(service.updatePaymentMethod(ADMIN, 1, { provider: 'paypal' }));
    expect(msg).toMatch(/unknown payment provider/i);
    expect(referenceModel.updatePaymentMethod).not.toHaveBeenCalled();
  });

  it('updates without touching code', async () => {
    await service.updatePaymentMethod(ADMIN, 1, { name: 'Renamed', requires_proof: false });
    expect(referenceModel.updatePaymentMethod).toHaveBeenCalledWith(
      1, expect.objectContaining({ name: 'Renamed', requires_proof: false })
    );
    expect(referenceModel.updatePaymentMethod.mock.calls[0][1].code).toBeUndefined();
  });

  it('update 404s on an unknown id', async () => {
    referenceModel.findPaymentMethodById.mockResolvedValue([]);
    expect(await statusOf(service.updatePaymentMethod(ADMIN, 99, { name: 'X' }))).toBe(404);
  });

  it('toggle 404s on an unknown id', async () => {
    referenceModel.findPaymentMethodById.mockResolvedValue([]);
    expect(await statusOf(service.setPaymentMethodActive(ADMIN, 99, false))).toBe(404);
  });

  it('deactivating explains existing payments are unaffected', async () => {
    const res = await service.setPaymentMethodActive(ADMIN, 1, false);
    expect(res.message).toMatch(/unaffected/i);
  });
});

describe('staff accounts', () => {
  const valid = {
    employee_id: 'CLERK99', full_name: 'New Clerk',
    password: 'Temp_pass1234', role: 'clerk', desk_assignment: 'Finance',
  };

  it('creates one and forces a password change at first login', async () => {
    const res = await service.createStaff(ADMIN, valid);
    expect(userModel.createStaff).toHaveBeenCalled();
    expect(res.message).toMatch(/must change this temporary password/i);
  });

  it('stores a bcrypt hash, never the plaintext', async () => {
    await service.createStaff(ADMIN, valid);
    const stored = userModel.createStaff.mock.calls[0][0].password_hash;
    expect(stored).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, stored)).toBe(true);
  });

  it('never echoes the password back to the caller', async () => {
    const res = await service.createStaff(ADMIN, valid);
    expect(JSON.stringify(res)).not.toContain(valid.password);
  });

  it('rejects a short temporary password', async () => {
    expect(await statusOf(service.createStaff(ADMIN, { ...valid, password: 'short' }))).toBe(400);
  });
  it.each(['temporary123_', 'TEMPORARY123_', 'Temporary_only', 'Temporary123', 'Aa1_' + 'a'.repeat(61)])('rejects a noncompliant Admin password on creation and reset: %s', async password => {
    await expect(service.createStaff(ADMIN, { ...valid, password })).rejects.toMatchObject({ status: 400 });
    await expect(service.updateStaff(ADMIN, 5, { password })).rejects.toMatchObject({ status: 400 });
    expect(userModel.createStaff).not.toHaveBeenCalled();
    expect(userModel.updateStaff).not.toHaveBeenCalled();
  });

  it.each([['employee_id'], ['full_name']])('requires %s', async (field) => {
    expect(await statusOf(service.createStaff(ADMIN, { ...valid, [field]: '' }))).toBe(400);
  });

  it('rejects an unknown role', async () => {
    expect(await statusOf(service.createStaff(ADMIN, { ...valid, role: 'superuser' }))).toBe(400);
  });

  it('requires a valid desk for a clerk', async () => {
    expect(await statusOf(service.createStaff(ADMIN, { ...valid, desk_assignment: 'Nowhere' }))).toBe(400);
  });

  it('defaults an admin to the Admin Office desk', async () => {
    await service.createStaff(ADMIN, { ...valid, role: 'admin', desk_assignment: undefined });
    expect(userModel.createStaff.mock.calls[0][0].desk_assignment).toBe('Admin Office');
  });

  it('rejects a duplicate employee ID', async () => {
    userModel.findExistingByStudentId.mockResolvedValue([{ id: 1 }]);
    expect(await messageOf(service.createStaff(ADMIN, valid))).toMatch(/already taken/i);
  });

  it('re-arms the forced change when an admin resets a password', async () => {
    await service.updateStaff(ADMIN, 5, { password: 'Another_temp1234' });
    const fields = userModel.updateStaff.mock.calls[0][1];
    expect(fields.must_change_password).toBe(true);
    expect(fields.password_hash).toBeDefined();
  });

  it('rejects an update with no fields', async () => {
    expect(await statusOf(service.updateStaff(ADMIN, 5, {}))).toBe(400);
  });

  it('404s for a non-staff target', async () => {
    userModel.findById.mockResolvedValue([{ id: 3, role: 'student' }]);
    expect(await statusOf(service.updateStaff(ADMIN, 3, { full_name: 'X' }))).toBe(404);
  });

  it('deactivates rather than deletes, preserving the audit trail', async () => {
    await service.setStaffActive(ADMIN, 5, false);
    expect(userModel.setUserActive).toHaveBeenCalledWith(5, false, expect.any(Object));
    expect(userModel.logSecurityEvent).toHaveBeenCalledWith(ADMIN.id, 'ACCOUNT_DEACTIVATED:5', null, null, expect.any(Object));
  });

  it('stops an admin from deactivating their own account', async () => {
    userModel.findById.mockResolvedValue([{ id: 7, role: 'admin' }]);
    const msg = await messageOf(service.setStaffActive(ADMIN, 7, false));
    expect(msg).toMatch(/cannot deactivate your own/i);
    expect(userModel.setUserActive).not.toHaveBeenCalled();
  });

  it('still lets an admin reactivate their own account', async () => {
    userModel.findById.mockResolvedValue([{ id: 7, role: 'admin' }]);
    await expect(service.setStaffActive(ADMIN, 7, true)).resolves.toBeTruthy();
  });
});

describe('account editing — approved profile fields only', () => {
  beforeEach(() => { vi.spyOn(userModel, 'updateProfile').mockResolvedValue([{ affectedRows: 1 }]); });
  it.each([CLERK, STUDENT])('rejects a non-admin before querying the account', async user => {
    expect(await statusOf(service.updateAccount(user, 5, { full_name: 'Changed' }))).toBe(403);
    expect(userModel.findById).not.toHaveBeenCalled();
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
  it.each(['student_id', 'employee_id'])('keeps %s immutable', async key => {
    expect(await statusOf(service.updateAccount(ADMIN, 5, { [key]: 'OTHER', full_name: 'Changed' }))).toBe(400);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
  it('updates an alumni profile without accepting privilege or verification changes', async () => {
    userModel.findById.mockResolvedValue([{ id: 5, role: 'student', user_type: 'alumni' }]);
    await service.updateAccount(ADMIN, 5, { full_name: '  Ana Reyes ', email: 'ana@example.test', phone_number: '09123456789', course: 'BS IT', college_id: '1', role: 'admin', verification_status: 'verified', is_active: true });
    expect(userModel.updateProfile).toHaveBeenCalledExactlyOnceWith(5, { full_name: 'Ana Reyes', email: 'ana@example.test', phone_number: '09123456789', course: 'BS IT', college_id: 1 });
  });
  it.each([{ full_name: '' }, { email: 'bad-email' }, { phone_number: '1'.repeat(21) }, { course: 'a'.repeat(101) }, { college_id: -1 }, { role: 'admin' }])('rejects invalid or unsupported edits (%o)', async fields => {
    expect(await statusOf(service.updateAccount(ADMIN, 5, fields))).toBe(400);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
});

describe('fee schedule settings', () => {
  let connection;
  beforeEach(() => {
    connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
    vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
    vi.spyOn(pricingModel, 'saveSchedules').mockResolvedValue(undefined);
  });
  const settings = { rental_fee: '20.00', special_fee: 10, fee_items: [{ label: 'Certification', amount: 5 }],
    college_fee_schedules: [{ college_id: 1, base_fee: 80, fee_rule: 'flat', rental_fee: 0, special_fee: 0, fee_items: [] }] };
  it('saves base settings and complete college schedules in one transaction', async () => {
    await service.updateDocumentType(ADMIN, 1, settings);
    expect(referenceModel.updateDocumentType).toHaveBeenCalledWith(1, expect.objectContaining({ rental_fee: 20 }), connection);
    expect(pricingModel.saveSchedules).toHaveBeenCalledWith(1, expect.objectContaining({ college_fee_schedules: [expect.objectContaining({ base_fee: 80, college_id: 1 })] }), connection);
    expect(connection.commit).toHaveBeenCalledOnce();
  });
  it('rolls back the entire save when an override fails', async () => {
    pricingModel.saveSchedules.mockRejectedValue(new Error('override failed'));
    await expect(service.updateDocumentType(ADMIN, 1, settings)).rejects.toThrow('override failed');
    expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.commit).not.toHaveBeenCalled();
  });
  it.each([CLERK, STUDENT])('rejects non-Admin rate changes', async user => {
    await expect(service.updateDocumentType(user, 1, settings)).rejects.toMatchObject({ status: 403 });
    expect(pricingModel.saveSchedules).not.toHaveBeenCalled();
  });
  it.each([
    { rental_fee: -1 }, { special_fee: '1.001' }, { fee_items: [{ label: '', amount: 1 }] },
    { college_fee_schedules: [{ college_id: 1, base_fee: 80 }] },
    { college_fee_schedules: [settings.college_fee_schedules[0], settings.college_fee_schedules[0]] },
  ])('rejects malformed settings before opening a write transaction: %j', async data => {
    await expect(service.updateDocumentType(ADMIN, 1, data)).rejects.toMatchObject({ status: 400 });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});


describe('fee input precision on creation', () => {
  it.each(['1e2', '', '0.001'])('rejects invalid raw base fee %s instead of coercing it', async base_fee => {
    await expect(service.createDocumentType(ADMIN, { name: 'New Document', base_fee })).rejects.toMatchObject({ status: 400 });
    expect(referenceModel.createDocumentType).not.toHaveBeenCalled();
  });
});
