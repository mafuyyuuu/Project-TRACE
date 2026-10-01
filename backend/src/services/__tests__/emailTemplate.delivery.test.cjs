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
it.each(['saved', 'default'])('delivers a Verify Email button with the exact token link in the %s layout', async layout => {
  if (layout === 'default') model.findByKey.mockRejectedValue(new Error('missing table'));
  const url = `https://trace.example/verify-email#token=${'a'.repeat(64)}`;
  const text = `Verify your email:\n\n${url}\n\nExpires in one hour.`;
  await notifications.sendEmail('recipient@example.test', 'Verify', text, { action: { url, label: 'Verify Email' } });
  const sent = mail.sendMail.mock.calls[0][0];
  expect(sent.text).toBe(text);
  expect(sent.html).toContain(`href="${url}"`);
  expect(sent.html).toContain('>Verify Email</a>');
  expect(sent.html).not.toContain(`>${url}</a>`);
  for (const style of ['display:inline-block', 'background-color:#15803d', 'color:#ffffff', 'padding:12px 24px', 'border-radius:8px']) expect(sent.html).toContain(style);
  expect(sent.html).toContain('Expires in one hour.');
});
