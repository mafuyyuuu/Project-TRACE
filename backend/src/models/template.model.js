const pool = require('../config/db');

function list() {
  return pool.query('SELECT id, template_key, name, font_family, font_size, updated_at FROM system_templates ORDER BY id ASC').then(([rows]) => rows);
}

function findByKey(key) {
  return pool.query('SELECT * FROM system_templates WHERE template_key = ?', [key]).then(([rows]) => rows[0]);
}

function update(key, content, fontFamily, fontSize) {
  return pool.query(
    'UPDATE system_templates SET content = ?, font_family = ?, font_size = ? WHERE template_key = ?',
    [content, fontFamily, fontSize, key]
  );
}

module.exports = { list, findByKey, update };
