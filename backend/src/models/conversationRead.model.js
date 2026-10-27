const { pool } = require('../config/db');
const { badRequest } = require('../utils/AppError');
// Identifiers come exclusively from this allowlist, never from request input.
const sources = {
  support: ['support_ticket_messages','ticket_id'],
  staff: ['staff_conversation_messages','conversation_id'],
  internal: ['internal_assistance_messages','ticket_id'],
};
function source(channel) {
  if (!Object.hasOwn(sources,channel)) throw new Error('INVALID_READ_CHANNEL');
  return sources[channel];
}
async function withUnread(channel,userId,rows,executor = pool) {
  if (!rows.length) return rows;
  const [table,column] = source(channel), ids = rows.map(row => row.id);
  const [counts] = await executor.query(`SELECT m.${column} AS id,COUNT(*) AS unread_count
    FROM ${table} m LEFT JOIN conversation_reads r ON r.user_id=? AND r.channel=? AND r.conversation_id=m.${column}
    WHERE m.${column} IN (${ids.map(() => '?').join(',')}) AND m.sender_id<>? AND m.id>COALESCE(r.last_message_id,0)
    GROUP BY m.${column}`, [userId,channel,...ids,userId]);
  const unread = new Map(counts.map(row => [String(row.id),Number(row.unread_count)]));
  return rows.map(row => ({...row,unread_count:unread.get(String(row.id)) || 0}));
}
/** Call only after resource authorization. A cursor cannot acknowledge another thread or future messages. */
async function mark(channel,userId,conversationId,through,executor = pool) {
  if (!['number','string'].includes(typeof through) || !/^[1-9]\d*$/.test(String(through)) || !Number.isSafeInteger(Number(through))) throw badRequest('Choose a valid message read position.');
  const [table,column] = source(channel);
  const [rows] = await executor.query(`SELECT id FROM ${table} WHERE ${column}=? AND id=?`,[conversationId,Number(through)]);
  if (!rows.length) throw badRequest('The read position does not belong to this conversation.');
  await executor.query(`INSERT INTO conversation_reads(user_id,channel,conversation_id,last_message_id) VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE last_message_id=GREATEST(last_message_id,VALUES(last_message_id))`,[userId,channel,conversationId,Number(through)]);
  return {read_through:Number(through)};
}
module.exports = {withUnread,mark};
