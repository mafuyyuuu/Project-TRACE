const { pool } = require('../../config/db');
const templates = require('../template.model');

it('lists template metadata through the configured pool', async () => {
  const rows = [{ id: 1, template_key: 'payment_slip', name: 'Payment Slip' }];
  const query = vi.spyOn(pool, 'query').mockResolvedValue([rows]);
  await expect(templates.list()).resolves.toEqual(rows);
  expect(query).toHaveBeenCalledWith('SELECT id, template_key, name, font_family, font_size, updated_at FROM system_templates ORDER BY id ASC');
});

it('binds the template key rather than interpolating it into the read query', async () => {
  const row = { template_key: 'payment_slip', content: '<p>Payment</p>' };
  const query = vi.spyOn(pool, 'query').mockResolvedValue([[row]]);
  const key = "payment_slip' OR 1=1 --";
  await expect(templates.findByKey(key)).resolves.toEqual(row);
  expect(query).toHaveBeenCalledWith('SELECT * FROM system_templates WHERE template_key = ?', [key]);
});

it('preserves the confirmed update fields and parameterized write', async () => {
  const query = vi.spyOn(pool, 'query').mockResolvedValue([{ affectedRows: 1 }]);
  await templates.update('payment_slip', '<p>{{AMOUNT}}</p>', 'serif', '12px');
  expect(query).toHaveBeenCalledWith(
    'UPDATE system_templates SET content = ?, font_family = ?, font_size = ? WHERE template_key = ?',
    ['<p>{{AMOUNT}}</p>', 'serif', '12px', 'payment_slip']
  );
});

it('propagates missing-table errors for the controller to report', async () => {
  const error = Object.assign(new Error('missing template table'), { code: 'ER_NO_SUCH_TABLE' });
  vi.spyOn(pool, 'query').mockRejectedValue(error);
  await expect(templates.list()).rejects.toBe(error);
});
