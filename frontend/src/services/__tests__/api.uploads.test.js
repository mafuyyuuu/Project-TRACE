import { once } from 'node:events';
import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import api, { getPendingApiRequests } from '@/services/api';
import { saveAttachmentAction } from '@/services/requestAttachmentsService';
import { sendTicketMessage } from '@/services/supportTicketsService';
import { uploadDeferredOR } from '@/services/documentsService';

const originalBase = api.defaults.baseURL;
let server;
let received;

// Exercise actual browser XHR and inspect the transmitted multipart body.
// Synthetic bytes verify transport only; production file validation is separate.
beforeAll(async () => {
  server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'];
    const isMultipart = contentType.startsWith('multipart/form-data');
    received = {
      headers: req.headers,
      body: isMultipart ? body.toString() : JSON.parse(body.toString()),
    };

    const field = req.url.endsWith('/upload') ? 'attachment'
      : req.url.endsWith('/messages') ? 'files'
        : req.url.endsWith('/deferred-or') ? 'officialReceipt' : null;
    const hasFile = !field || (isMultipart
      && received.body.includes(`name="${field}"; filename="`));
    res.writeHead(hasFile ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(hasFile
      ? { message: 'Attachment received.' }
      : { error: 'Choose the pertinent document to upload.' }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
});

afterEach(() => {
  localStorage.clear();
  expect(getPendingApiRequests()).toBe(0);
});

afterAll(async () => {
  api.defaults.baseURL = originalBase;
  await new Promise(resolve => server.close(resolve));
});

it('delivers the chosen attachment as multipart bytes through real Axios/XHR', async () => {
  localStorage.setItem('trace_token', 'synthetic-token');
  const file = new File(['synthetic document bytes'], 'case.pdf', { type: 'application/pdf' });
  await expect(saveAttachmentAction(11, { kind: 'upload', id: 9, file }))
    .resolves.toMatchObject({ message: 'Attachment received.' });
  expect(received.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  expect(received.headers.authorization).toBe('Bearer synthetic-token');
  expect(received.body).toContain('name="attachment"; filename="case.pdf"');
  expect(received.body).toContain('Content-Type: application/pdf');
  expect(received.body).toContain('synthetic document bytes');
  const boundary = received.headers['content-type'].split('boundary=')[1];
  expect(received.body).toContain(`--${boundary}`);
});

it('preserves support-message text, retry key and attachment bytes together', async () => {
  const file = new File(['synthetic support'], 'case.png', { type: 'image/png' });
  await sendTicketMessage(1, 'Please review this document.', [file], 'synthetic-retry-key');
  expect(received.body).toContain('name="message"');
  expect(received.body).toContain('Please review this document.');
  expect(received.body).toContain('name="client_key"');
  expect(received.body).toContain('synthetic-retry-key');
  expect(received.body).toContain('name="files"; filename="case.png"');
  expect(received.body).toContain('synthetic support');
});

it('delivers a deferred official receipt without losing its file', async () => {
  const file = new File(['synthetic receipt'], 'receipt.pdf', { type: 'application/pdf' });
  await uploadDeferredOR(11, file, { orNumber: 'SYNTHETIC-OR', orDate: '2026-10-13' });
  expect(received.body).toContain('name="officialReceipt"; filename="receipt.pdf"');
  expect(received.body).toContain('synthetic receipt');
  expect(received.body).toContain('name="or_number"');
  expect(received.body).toContain('SYNTHETIC-OR');
  expect(received.body).toContain('name="or_date"');
  expect(received.body).toContain('2026-10-13');
});

it('still sends ordinary object payloads as JSON', async () => {
  await api.post('/synthetic-json', { action: 'synthetic-review', value: 10 });
  expect(received.headers['content-type']).toMatch(/^application\/json/);
  expect(received.body).toEqual({ action: 'synthetic-review', value: 10 });
});
