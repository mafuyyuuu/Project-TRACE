export const SUPPORT_STATES = { FAQ_ASSISTANCE: 'FAQ assistance', QUEUED: 'Queued', IN_PROGRESS: 'In progress', AWAITING_STUDENT: 'Awaiting student', RESOLVED: 'Resolved' };
const validDate = value => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
export function supportDay(value) {
  const date = validDate(value);
  return date ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }) : '';
}
export function supportTime(value) {
  const date = validDate(value);
  return date ? date.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }) : '';
}
export function ticketMatches(ticket, query) {
  const term = query.trim().toLocaleLowerCase();
  return !term || [ticket.id, `#${ticket.id}`, ticket.subject, ticket.student_name, ticket.student_id, ticket.tracking_number, SUPPORT_STATES[ticket.state]].some(value => String(value ?? '').toLocaleLowerCase().includes(term));
}
export function ticketInitials(ticket) {
  const words = String(ticket.student_name || ticket.subject || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase() || '#';
}
