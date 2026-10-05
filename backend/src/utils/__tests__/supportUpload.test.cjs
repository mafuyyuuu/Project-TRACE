const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument, PDFName } = require('pdf-lib');
const { validateContent, validateFiles, cleanup, MAX_BYTES } = require('../supportUpload');
let directory;
beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'trace-synthetic-upload-')); });
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });
async function image(format) { return sharp({ create: { width: 4, height: 4, channels: 3, background: '#185b38' } })[format]().toBuffer(); }
async function pdf(active = false) {
  const doc = await PDFDocument.create(); doc.addPage([100,100]);
  if (active) doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'synthetic test only' }));
  return Buffer.from(await doc.save());
}
it.each([['png','image/png'],['jpeg','image/jpeg']])('fully decodes a synthetic %s image', async (format,mime) => {
  await expect(validateContent(await image(format),mime)).resolves.toBeUndefined();
});
it('rejects truncated image pixels and a mismatched declared format', async () => {
  const bytes = await image('png');
  await expect(validateContent(bytes.subarray(0,45),'image/png')).rejects.toMatchObject({status:400});
  await expect(validateContent(bytes,'image/jpeg')).rejects.toMatchObject({status:400});
});
it('parses a passive synthetic PDF and rejects malformed/header-only files and active actions', async () => {
  await expect(validateContent(await pdf(),'application/pdf')).resolves.toBeUndefined();
  await expect(validateContent(Buffer.from('%PDF-1.7\n1 0 obj /Type /Catalog endobj\n%%EOF'),'application/pdf')).rejects.toMatchObject({status:400});
  await expect(validateContent(await pdf(true),'application/pdf')).rejects.toMatchObject({status:400});
});
it('detects encoded PDF action names after parsing rather than matching raw text', async () => {
  const bytes = (await pdf(true)).toString('latin1').replace('/OpenAction','/Open#41ction');
  await expect(validateContent(Buffer.from(bytes,'latin1'),'application/pdf')).rejects.toMatchObject({status:400});
});
it('enforces file count, size, name and extension before decoding', async () => {
  await expect(validateFiles(Array(4).fill({}))).rejects.toMatchObject({status:400});
  for (const file of [{size:MAX_BYTES+1,originalname:'file.png',mimetype:'image/png'}, {size:1,originalname:'file.svg',mimetype:'image/png'}, {size:1,originalname:'\n.png',mimetype:'image/png'}]) {
    await expect(validateFiles([file])).rejects.toMatchObject({status:400});
  }
});
it('checks on-disk length, hashes the accepted original and cleans failed/retried files', async () => {
  const bytes = await image('png'), filename = path.join(directory,'synthetic.png'); await fs.writeFile(filename,bytes);
  const file = {path:filename,size:bytes.length,originalname:'synthetic.png',mimetype:'image/png'};
  await validateFiles([file]); expect(file.content_hash).toMatch(/^[a-f0-9]{64}$/);
  await expect(validateFiles([{...file,size:bytes.length-1}])).rejects.toMatchObject({status:400});
  await cleanup([file]); await expect(fs.stat(filename)).rejects.toMatchObject({code:'ENOENT'});
  await expect(cleanup([file])).resolves.toBeUndefined();
});
