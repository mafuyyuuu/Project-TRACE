const express = require('express');
const http = require('http');
const fs = require('fs/promises');
const { documentUpload } = require('../upload.middleware');
const errors = require('../errorHandler.middleware');

async function upload(name, type) {
  const app = express();
  app.post('/', documentUpload.single('file'), async (req, res) => {
    await fs.unlink(req.file.path);
    res.json({ accepted: true });
  });
  app.use(errors);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const data = new FormData(); data.append('file', new Blob(['synthetic bytes'], { type }), name);
    const res = await fetch(`http://127.0.0.1:${server.address().port}`, { method: 'POST', body: data });
    return { status: res.status, body: await res.json() };
  } finally { await new Promise(resolve => server.close(resolve)); }
}
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
it.each([['attack.html', 'image/png'], ['fake.pdf', 'text/html'], ['hidden.jpg.exe', 'image/jpeg'], ['fake.docx', 'image/jpeg']])('rejects executable or mismatched upload %s', async (name, type) => {
  expect((await upload(name, type)).status).toBe(400);
});
it.each([['SCAN.JPG', 'image/jpeg'], ['scan.png', 'image/png'], ['scan.pdf', 'application/pdf'], ['form.doc', 'application/msword'], ['form.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']])('retains supported matching file %s', async (name, type) => {
  expect(await upload(name, type)).toEqual({ status: 200, body: { accepted: true } });
});
