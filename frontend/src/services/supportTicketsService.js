import api from '@/services/api';
const base = '/support/tickets';
const options = signal => ({ signal, timeout: 15000 });
const states = ['FAQ_ASSISTANCE', 'QUEUED', 'IN_PROGRESS', 'AWAITING_STUDENT', 'RESOLVED'];
export function ticketValid(ticket) { return ticket && Number.isSafeInteger(Number(ticket.id)) && Number(ticket.id)>0 && states.includes(ticket.state) && typeof ticket.subject === 'string'; }
function faqTopics(data) {
  if(!Array.isArray(data?.topics) || data.topics.some(row=>!row || typeof row.id!=='string' || typeof row.question!=='string' || typeof row.answer!=='string')) throw new Error('Invalid approved FAQ response.');
  return data.topics;
}
function documentTypes(data) {
  if(!Array.isArray(data?.types) || data.types.some(row=>!row || !Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0 || typeof row.name!=='string')) throw new Error('Invalid supporting-document catalog.');
  return data.types;
}
export async function getTickets(before, signal) {
  const { data } = await api.get(base, { ...options(signal), params: before ? { before } : {} });
  if (!Array.isArray(data?.tickets) || data.tickets.some(ticket => !ticketValid(ticket))) throw new Error('Invalid ticket list.');
  return data;
}
export async function getTicket(id, before, signal) {
  const { data } = await api.get(`${base}/${id}`, { ...options(signal), params: before ? { before } : {} });
  if (!ticketValid(data?.ticket) || !Array.isArray(data.messages) || data.messages.some(row => !row.id || typeof row.message !== 'string')) throw new Error('Invalid ticket conversation.');
  return data;
}
export async function createTicket(payload) { return (await api.post(base, payload, { timeout: 15000 })).data; }
export async function sendTicketMessage(id, message, files, clientKey) {
  const form = new FormData(); form.append('message', message); form.append('client_key', clientKey);
  files.forEach(file => form.append('files', file));
  return (await api.post(`${base}/${id}/messages`, form, { timeout: 30000 })).data;
}
export async function ticketAction(id, action, clientKey) { return (await api.post(`${base}/${id}/actions`, { action, client_key: clientKey }, { timeout: 15000 })).data; }
export async function ticketFaq(id, topicId, action, clientKey) { return (await api.post(`${base}/${id}/faq`, { topic_id: topicId, action, client_key: clientKey }, { timeout: 15000 })).data; }
export async function getSupportSettings(signal) { return (await api.get(`${base}/settings`, options(signal))).data; }
export async function saveSupportSettings(settings) { return (await api.put(`${base}/settings`, settings, { timeout: 15000 })).data; }
export async function setSupportAvailability(available) { return (await api.put(`${base}/availability`, { available }, { timeout: 15000 })).data; }
export async function claimSupportTicket() { return (await api.post(`${base}/claim`, {}, { timeout: 15000 })).data; }
export async function getSupportFaq(signal) { return faqTopics((await api.get(`${base}/faq`, options(signal))).data); }
export async function matchSupportFaq(q, signal) { return faqTopics((await api.get(`${base}/faq/match`, { ...options(signal), params: { q } })).data); }
export async function getSupportingDocuments(signal) { return documentTypes((await api.get(`${base}/supporting-documents`,options(signal))).data); }
export async function resolveSupportContext(params,signal) { return (await api.get(`${base}/context`,{...options(signal),params})).data.ticket; }
export async function saveSupportingDocument(payload) { return documentTypes((await api.put(`${base}/supporting-documents`,payload,{timeout:15000})).data); }
export async function getSupportMetrics(params,signal) { return (await api.get(`${base}/metrics`,{...options(signal),params})).data; }
