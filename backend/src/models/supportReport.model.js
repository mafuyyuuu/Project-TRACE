const { pool } = require('../config/db');
const { query } = require('./supportTicket.model');
async function dataset(from,to,executor=pool) {
  const [tickets]=await query(executor,`SELECT t.id,t.category,t.imported,t.created_at FROM support_tickets t
    WHERE t.created_at>=? AND t.created_at<? OR EXISTS(SELECT 1 FROM support_ticket_events e WHERE e.ticket_id=t.id AND e.created_at>=? AND e.created_at<?)
    ORDER BY t.id LIMIT 10001`,[from,to,from,to]);
  if(tickets.length>10000) throw Object.assign(new Error('Choose a shorter support reporting period.'),{status:400});
  let events=[];
  if(tickets.length) [events]=await query(executor,`SELECT e.id,e.ticket_id,e.actor_id,e.event_type,e.data,e.created_at,u.full_name AS actor_name
    FROM support_ticket_events e LEFT JOIN users u ON u.id=e.actor_id
    WHERE e.ticket_id IN (?) AND e.created_at<? ORDER BY e.ticket_id,e.created_at,e.id LIMIT 50001`,[tickets.map(ticket=>ticket.id),to]);
  if(events.length>50000) throw Object.assign(new Error('Choose a shorter support reporting period.'),{status:400});
  const [backlog]=await query(executor,`SELECT COALESCE(e.event_type,'unknown') AS last_transition,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(e.data,'$.via')),'') AS via,COUNT(*) AS count
    FROM support_tickets t LEFT JOIN support_ticket_events e ON e.id=(SELECT prior.id FROM support_ticket_events prior
      WHERE prior.ticket_id=t.id AND prior.created_at<? AND prior.event_type IN ('created','imported','escalated','claimed','resolve','reopen','await_student','response_timeout','requeued')
      ORDER BY prior.created_at DESC,prior.id DESC LIMIT 1)
    WHERE t.created_at<? GROUP BY last_transition,via`,[to,to]);
  return {tickets,events,backlog};
}
module.exports = { dataset };
