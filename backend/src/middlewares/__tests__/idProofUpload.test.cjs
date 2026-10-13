const { idProofUpload } = require('../upload.middleware');
it('retains the bounded proof upload after signup autofill is removed', () => {
  expect(idProofUpload.limits.fileSize).toBe(10 * 1024 * 1024);
  const callback = vi.fn();
  idProofUpload.fileFilter({}, { originalname: 'proof.svg', mimetype: 'image/svg+xml' }, callback);
  expect(callback).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }), false);
  idProofUpload.fileFilter({}, { originalname: 'proof.png', mimetype: 'image/png' }, callback);
  expect(callback).toHaveBeenLastCalledWith(null, true);
});
