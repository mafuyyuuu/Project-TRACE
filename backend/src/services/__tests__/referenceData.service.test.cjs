const service = require('../referenceData.service');
const reference = require('../../models/referenceData.model');
const pricing = require('../../models/pricing.model');
const user = require('../../models/user.model');
const policy = require('../documentPolicy.service');
beforeEach(() => {
  vi.spyOn(reference, 'listDocumentTypes').mockResolvedValue([{ id: 7, name: 'Test', base_fee: 50, fee_rule: 'flat' }]);
  vi.spyOn(pricing, 'attachSchedules').mockImplementation(async types => types.map(type => ({ ...type, rental_fee: 5, special_fee: 10, fee_items: [],
    college_fee_schedules: [{ college_id: 2, base_fee: 80, fee_rule: 'flat', rental_fee: 0, special_fee: 0, fee_items: [{ label: 'Certification', amount: 15 }] }] })));
  vi.spyOn(user, 'findStudentIdById').mockResolvedValue([{ student_id: 'STU-1' }]);
  vi.spyOn(policy, 'resolveStudent').mockResolvedValue({ college_id: 2 });
  vi.spyOn(policy, 'eligibility').mockResolvedValue(null);
});
it('uses the authenticated student college, with no caller-selected rate', async () => {
  const { document_types } = await service.listDocumentTypes({ user: { id: 1, role: 'student', college_id: 999 } });
  expect(document_types[0]).toMatchObject({ base_fee: 80, source: 'college', college_id: 2, rental_fee: 0, fee_items: [{ label: 'Certification', amount: 15 }] });
  expect(policy.resolveStudent).toHaveBeenCalledWith('STU-1');
});
it('uses default rates when no college override applies', async () => {
  policy.resolveStudent.mockResolvedValue({ college_id: 3 });
  expect((await service.listDocumentTypes({ user: { id: 1, role: 'student' } })).document_types[0]).toMatchObject({ base_fee: 50, rental_fee: 5, special_fee: 10, source: 'default' });
});
it('propagates a failed fee lookup instead of quoting an incorrect default', async () => {
  pricing.attachSchedules.mockRejectedValue(new Error('fees unavailable'));
  await expect(service.listDocumentTypes()).rejects.toThrow('fees unavailable');
});
