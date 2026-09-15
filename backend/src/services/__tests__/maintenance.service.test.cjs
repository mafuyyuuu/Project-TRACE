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
const service = require('../maintenance.service');

const ADMIN = { id: 7, role: 'admin' };
const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };
const STUDENT = { id: 3, role: 'student' };

const statusOf = (p) => p.then(() => undefined, (e) => e.status);
const messageOf = (p) => p.then(() => '', (e) => e.message);

beforeEach(() => {
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
    password: 'temp-pass-1234', role: 'clerk', desk_assignment: 'Finance',
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
    await service.updateStaff(ADMIN, 5, { password: 'another-temp-1234' });
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
    expect(userModel.setUserActive).toHaveBeenCalledWith(5, false);
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
