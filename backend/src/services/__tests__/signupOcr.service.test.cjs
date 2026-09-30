const fs = require('fs/promises');
const ai = require('../aiEngine.service');
const refs = require('../../models/referenceData.model');
const { extractIdentity } = require('../signupOcr.service');
const file = { path: '/temporary/ocr-temp-test.png' };
beforeEach(() => {
  vi.spyOn(fs, 'unlink').mockResolvedValue();
  vi.spyOn(ai, 'extractIdentity').mockResolvedValue(null);
  vi.spyOn(refs, 'findCollegeByName').mockResolvedValue([]);
});
it('cleans up a timed-out scan and retains the manual fallback', async () => {
  expect(await extractIdentity(file)).toMatchObject({ success: false });
  expect(fs.unlink).toHaveBeenCalledWith(file.path);
});
it('cleans up when processing throws', async () => {
  ai.extractIdentity.mockRejectedValue(new Error('engine offline'));
  await expect(extractIdentity(file)).rejects.toThrow('engine offline');
  expect(fs.unlink).toHaveBeenCalledWith(file.path);
});
it('returns only supported fields and matches a college exactly', async () => {
  ai.extractIdentity.mockResolvedValue({ success: true, raw_text: 'private', extracted_data: { alumni_id: 'ALU1234567', full_name: 'Ana Reyes', college_name: 'College A' } });
  refs.findCollegeByName.mockResolvedValue([{ id: 2, name: 'College A', is_active: 1 }]);
  const data = await extractIdentity(file);
  expect(data).toMatchObject({ alumni_id: 'ALU1234567', full_name: 'Ana Reyes', college_id: 2 });
  expect(data).not.toHaveProperty('raw_text');
});
it('rejects missing proof and does not truncate overlength OCR fields', async () => {
  await expect(extractIdentity(null)).rejects.toMatchObject({ status: 400 });
  ai.extractIdentity.mockResolvedValue({ success: true, extracted_data: { alumni_id: 'X'.repeat(51) } });
  expect((await extractIdentity(file)).alumni_id).toBeNull();
});

it('rejects executable upload types and bounds both OCR and retained proof uploads', () => {
  const { signupOcrUpload, idProofUpload } = require('../../middlewares/upload.middleware');
  expect(signupOcrUpload.limits.fileSize).toBe(10 * 1024 * 1024);
  expect(idProofUpload.limits.fileSize).toBe(10 * 1024 * 1024);
  const callback = vi.fn();
  signupOcrUpload.fileFilter({}, { originalname: 'proof.svg', mimetype: 'image/svg+xml' }, callback);
  expect(callback).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }), false);
  signupOcrUpload.fileFilter({}, { originalname: 'proof.png', mimetype: 'image/png' }, callback);
  expect(callback).toHaveBeenLastCalledWith(null, true);
});
