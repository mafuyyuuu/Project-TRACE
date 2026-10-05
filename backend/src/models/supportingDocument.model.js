const { pool } = require('../config/db');
async function list(executor = pool) {
  const [rows] = await executor.query('SELECT id,name,is_active FROM supporting_document_types ORDER BY name,id'); return rows;
}
async function find(id, executor) {
  const [rows] = await executor.query('SELECT id,name,is_active FROM supporting_document_types WHERE id=? FOR UPDATE',[id]); return rows[0];
}
async function save(id, name, active, actorId, executor) {
  if (id) return executor.query('UPDATE supporting_document_types SET name=?,is_active=?,updated_by=? WHERE id=?',[name,active,actorId,id]);
  return executor.query('INSERT INTO supporting_document_types(name,is_active,updated_by) VALUES (?,?,?)',[name,active,actorId]);
}
module.exports = { list, find, save };
