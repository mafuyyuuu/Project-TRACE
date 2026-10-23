const {pool}=require('../config/db');
async function append(event,executor=pool){
  await executor.query(`INSERT INTO manual_faq_events(user_id,question_hash,question,action,suggestion,client_key,payload_hash,created_at_ms)
    VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
  [event.userId,event.questionHash,event.question,event.action,event.suggestion,event.clientKey,event.payloadHash,event.at]);
  const [rows]=await executor.query('SELECT payload_hash FROM manual_faq_events WHERE user_id=? AND client_key=?',[event.userId,event.clientKey]);return rows[0];
}
async function feedback(userId,executor=pool){
  const [rows]=await executor.query(`SELECT question,action,suggestion FROM (
    SELECT question,action,suggestion,ROW_NUMBER() OVER(PARTITION BY question_hash ORDER BY id DESC) AS position
    FROM manual_faq_events WHERE user_id=? AND action<>'view') ranked WHERE position=1`,[userId]);return rows;
}
async function events(from,to,executor=pool){
  const [rows]=await executor.query(`SELECT id,user_id,question_hash,question,action,suggestion,created_at_ms FROM manual_faq_events
    WHERE created_at_ms>=? AND created_at_ms<? ORDER BY created_at_ms,id LIMIT 50001`,[from.getTime(),to.getTime()]);return rows;
}
module.exports={append,feedback,events};
