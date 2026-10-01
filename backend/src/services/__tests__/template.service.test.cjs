const model = require('../../models/template.model');
const service = require('../template.service');
beforeEach(() => {
  vi.spyOn(model, 'findByKey').mockResolvedValue({ content: '<p>Saved</p>', font_family: 'serif', font_size: '12px' });
  vi.spyOn(model, 'update').mockResolvedValue([{}]);
});
it('cleans existing stored HTML on read without overwriting the saved record', async () => {
  model.findByKey.mockResolvedValue({ content: '<script>secret()</script><p onclick="bad()" style="position:fixed;color:#15803d">Body</p><img src="https://bad.test/collect"><a href="{{STUDENT_NAME}}">Name</a>', font_family: 'bad; background:url(secret)', font_size: '999px' });
  const row = await service.get('payment_slip');
  expect(row.content).not.toMatch(/script|onclick|position|img|href|secret/);
  expect(row.content).toContain('color:#15803d');
  expect(row).toMatchObject({ font_family: 'sans-serif', font_size: '12px' });
  expect(model.update).not.toHaveBeenCalled();
});
it('saves only supported content and retains the essential notice placeholder', async () => {
  await service.update('email_notice', { content: '<h2>{{SUBJECT}}</h2><p style="white-space:pre-wrap">{{MESSAGE}}</p><iframe src="https://bad.test"></iframe>', font_family: 'serif', font_size: '16px' });
  expect(model.update).toHaveBeenCalledWith('email_notice', '<h2>{{SUBJECT}}</h2><p style="white-space:pre-wrap">{{MESSAGE}}</p>', 'serif', '16px');
});
it.each([
  ['email_notice', '<p>No required body</p>', 'serif', '12px'],
  ['payment_slip', '<p>{{PASSWORD}}</p>', 'serif', '12px'],
  ['payment_slip', '<p>Body</p>', 'serif; color:red', '12px'],
  ['payment_slip', '<p>Body</p>', 'serif', '300px'],
])('rejects an unusable or unsafe configuration before writing', async (key, content, font_family, font_size) => {
  await expect(service.update(key, { content, font_family, font_size })).rejects.toMatchObject({ status: 400 });
  expect(model.update).not.toHaveBeenCalled();
});
it('keeps proof links clickable but escapes injected text and forbids unsafe link schemes', () => {
  const html = service.render('<p>{{MESSAGE}}</p><a href="javascript:bad()">unsafe</a>', { MESSAGE: 'Use https://trace.example/verify-email#token=synthetic\n<script>bad()</script>' }, true);
  expect(html).toContain('href="https://trace.example/verify-email#token=synthetic"');
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('javascript:');
});
it('does not interpolate replacement-string metacharacters or unescaped student values', () => {
  expect(service.render('<p>{{STUDENT_NAME}}</p>', { STUDENT_NAME: '$& <img src=x onerror=bad()>' })).toBe('<p>$&amp; &lt;img src=x onerror=bad()&gt;</p>');
});
it('labels only the explicit action link and escapes its label and query', () => {
  const url = 'https://trace.example/verify-email?lang=en&source=email#token=synthetic';
  const other = 'https://trace.example/help';
  const html = service.render('<p>{{MESSAGE}}</p>', { MESSAGE: `Verify ${url}\nHelp ${other}` }, true, { url, label: 'Verify <img src=x onerror=bad()>' });
  expect(html).toContain('href="https://trace.example/verify-email?lang=en&amp;source=email#token=synthetic"');
  expect(html).toContain('Verify &lt;img src=x onerror=bad()&gt;</a>');
  expect(html).not.toContain('<img');
  expect(html).toContain(`href="${other}">${other}</a>`);
});
it('does not render unsafe action URLs or retain active anchor styling', () => {
  const html = service.render('<p>{{MESSAGE}}</p><a href="javascript:bad()" style="position:fixed;display:block;background-image:url(https://bad.test)">Bad</a>', { MESSAGE: 'javascript:bad()' }, true, { url: 'javascript:bad()', label: 'Verify Email' });
  expect(html).not.toMatch(/href=|position:|display:block|background-image:|>Verify Email/);
});
