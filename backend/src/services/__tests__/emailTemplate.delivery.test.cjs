const nodemailer = require('nodemailer');
const env = require('../../config/env');
const model = require('../../models/template.model');
const mail = { sendMail: vi.fn().mockResolvedValue({ accepted: ['recipient@example.test'], rejected: [] }) };
const original = Object.fromEntries(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].map(key => [key, env[key]]));
let notifications;
let transportOptions;
beforeAll(() => {
  env.SMTP_HOST = 'synthetic.test'; env.SMTP_USER = 'synthetic@example.test'; env.SMTP_PASS = 'synthetic'; env.SMTP_FROM = 'synthetic@example.test';
  vi.spyOn(nodemailer, 'createTransport').mockImplementation(options => { transportOptions = options; return mail; });
  notifications = require('../notification.service');
});
afterAll(() => Object.assign(env, original));
beforeEach(() => {
  mail.sendMail.mockReset().mockResolvedValue({ accepted: ['recipient@example.test'], rejected: [] });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(model, 'findByKey').mockResolvedValue({ content: '<h2>Custom {{SUBJECT}}</h2><p>{{MESSAGE}}</p>', font_family: 'serif', font_size: '16px' });
});
it('uses the saved template for actual outbound HTML and retains the original plain text', async () => {
  const text = 'Open https://trace.example/verify-email#token=synthetic';
  expect(await notifications.sendEmail('recipient@example.test', 'Verify', text)).toMatchObject({ ok: true });
  const sent = mail.sendMail.mock.calls[0][0];
  expect(sent.to).toBe('recipient@example.test');
  expect(sent).not.toHaveProperty('cc'); expect(sent).not.toHaveProperty('bcc');
  expect(sent.from).toContain('synthetic@example.test');
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

it('bounds SMTP waits and leaves protocol/message debug logging disabled', () => {
  expect(transportOptions).toMatchObject({ connectionTimeout: 10000, greetingTimeout: 10000, dnsTimeout: 10000, socketTimeout: 20000 });
  expect(transportOptions.debug).not.toBe(true);
  expect(transportOptions.logger).not.toBe(true);
});

it.each([
  { accepted: [], rejected: ['recipient@example.test'] },
  { accepted: [], rejected: [] },
  {},
])('does not claim SMTP acceptance without an accepted recipient: %j', async info => {
  mail.sendMail.mockResolvedValue(info);
  expect(await notifications.sendEmail('recipient@example.test', 'Reset', 'private body'))
    .toMatchObject({ ok: false, outcome: 'smtp_rejected' });
  expect(console.log).not.toHaveBeenCalled();
  expect(JSON.stringify(console.warn.mock.calls)).not.toMatch(/recipient@|private body/);
});

it.each(['EAUTH', 'ETIMEDOUT', 'EENVELOPE', 'ESOCKET'])('reports safe %s metadata without logging provider content or credentials', async code => {
  const error = Object.assign(new Error('recipient@example.test password=secret reset-password#token=secret'), {
    code, responseCode: 535, command: 'AUTH PLAIN', response: 'raw provider secret', rejected: ['recipient@example.test'],
  });
  mail.sendMail.mockRejectedValue(error);
  const requestId = '12345678-1234-1234-1234-123456789abc';
  const result = await notifications.sendEmail('recipient@example.test', 'Reset', 'private token', { requestId, purpose: 'password_reset' });
  expect(result).toMatchObject({ ok: false, outcome: 'smtp_failed', diagnostics: { code, response_code: 535, command: 'AUTH PLAIN' } });
  expect(console.warn).toHaveBeenCalledWith('[Email]', expect.stringContaining(requestId));
  expect(JSON.stringify([result, console.warn.mock.calls])).not.toMatch(/recipient@|secret|private token|raw provider/);
});

it('sanitizes unrecognized error codes, commands and correlation metadata', async () => {
  mail.sendMail.mockRejectedValue(Object.assign(new Error('secret'), { code: 'secret', command: 'RCPT TO recipient@example.test', responseCode: 'secret' }));
  const result = await notifications.sendEmail('recipient@example.test', 'Reset', 'body', { requestId: 'token=secret', purpose: 'secret' });
  expect(result.diagnostics).toEqual({ code: 'UNKNOWN' });
  expect(JSON.stringify(console.warn.mock.calls)).not.toMatch(/secret|recipient@/);
});

it('reports recipient counts without claiming mailbox delivery', async () => {
  const result = await notifications.sendEmail('recipient@example.test', 'Reset', 'body');
  expect(result).toEqual({ ok: true, outcome: 'smtp_accepted', diagnostics: { accepted_count: 1, rejected_count: 0 } });
  expect(JSON.stringify(console.log.mock.calls)).not.toContain('recipient@example.test');
});
