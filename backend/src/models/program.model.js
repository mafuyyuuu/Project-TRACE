const { pool } = require('../config/db');

async function list({ includeInactive = false } = {}, executor = pool) {
  const [rows] = await executor.query(`SELECT p.id, p.college_id, p.name, p.is_active, c.name AS college_name, c.is_active AS college_active
    FROM programs p JOIN colleges c ON c.id = p.college_id
    ${includeInactive ? '' : 'WHERE p.is_active = TRUE AND c.is_active = TRUE'} ORDER BY c.sort_order, c.name, p.name`);
  return rows;
}
async function lockCollege(id, executor = pool) {
  const [rows] = await executor.query('SELECT id, name, is_active FROM colleges WHERE id = ? FOR UPDATE', [id]);
  return rows[0];
}
async function find(id, executor = pool, lock = false) {
  const [rows] = await executor.query(`SELECT id, college_id, name, is_active FROM programs WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0];
}
async function findByName(collegeId, name, executor = pool, lock = false) {
  const [rows] = await executor.query(`SELECT id, college_id, name, is_active FROM programs WHERE college_id = ? AND name = ?${lock ? ' FOR UPDATE' : ''}`, [collegeId, name]);
  return rows[0];
}
async function create(collegeId, name, executor = pool) {
  const [result] = await executor.query('INSERT INTO programs (college_id, name) VALUES (?, ?)', [collegeId, name]);
  return result.insertId;
}
async function setActive(id, active, executor = pool) {
  return executor.query('UPDATE programs SET is_active = ? WHERE id = ?', [active, id]);
}
module.exports = { list, lockCollege, find, findByName, create, setActive };
