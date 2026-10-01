const nodemailer = require('nodemailer');
const env = require('../../config/env');
const model = require('../../models/template.model');
const mail = { sendMail: vi.fn().mockResolvedValue({}) };
const original = Object.fromEntries(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].map(key => [key, env[key]]));
let notifications;
beforeAll(() => {
  env.SMTP_HOST = 'synthetic.test'; env.SMTP_USER = 'synthetic@example.test'; env.SMTP_PASS = 'synthetic';
  vi.spyOn(nodemailer, 'createTransport').mockReturnValue(mail);
  notifications = require('../notification.service');
});
afterAll(() => Object.assign(env, original));
beforeEach(() => {
  mail.sendMail.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(model, 'findByKey').mockResolvedValue({ content: '<h2>Custom {{SUBJECT}}</h2><p>{{MESSAGE}}</p>', font_family: 'serif', font_size: '16px' });
});
it('uses the saved template for actual outbound HTML and retains the original plain text', async () => {
  const text = 'Open https://trace.example/verify-email#token=synthetic';
  expect(await notifications.sendEmail('recipient@example.test', 'Verify', text)).toMatchObject({ ok: true });
  const sent = mail.sendMail.mock.calls[0][0];
  expect(sent.text).toBe(text); expect(sent.html).toContain('Custom Verify');
  expect(sent.html).toContain('href="https://trace.example/verify-email#token=synthetic"');
  expect(sent.html).toContain('TRACE');
});
it('delivers the branded default when template data is unavailable', async () => {
  model.findByKey.mockRejectedValue(new Error('missing table'));
  expect(await notifications.sendEmail('recipient@example.test', 'Reset', 'Body')).toMatchObject({ ok: true });
  expect(mail.sendMail.mock.calls[0][0].html).toContain('PLP Registrar');
});
