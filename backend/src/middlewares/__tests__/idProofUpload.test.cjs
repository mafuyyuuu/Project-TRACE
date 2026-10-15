const { idProofUpload } = require('../upload.middleware');
it('retains the bounded proof upload after signup autofill is removed', () => {
  expect(idProofUpload.limits.fileSize).toBe(10 * 1024 * 1024);
  const callback = vi.fn();
  idProofUpload.fileFilter({}, { originalname: 'proof.svg', mimetype: 'image/svg+xml' }, callback);
  expect(callback).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }), false);
  idProofUpload.fileFilter({}, { originalname: 'proof.png', mimetype: 'image/png' }, callback);
  expect(callback).toHaveBeenLastCalledWith(null, true);
});
it.each([
  ['proof.JPG', 'image/jpeg', true], ['proof.jpeg', 'image/jpeg', true], ['proof.pdf', 'application/pdf', true],
  ['proof.png', 'application/pdf', false], ['proof.pdf', 'image/png', false],
  ['proof.svg', 'image/svg+xml', false], ['proof.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
  ['proof.gif', 'image/gif', false], ['proof.webp', 'image/webp', false],
])('aligns registration file guidance with server type checks (%s, %s)', (originalname, mimetype, allowed) => {
  const callback = vi.fn();
  idProofUpload.fileFilter({}, { originalname, mimetype }, callback);
  expect(callback).toHaveBeenCalledWith(allowed ? null : expect.objectContaining({ status: 400 }), allowed);
});
