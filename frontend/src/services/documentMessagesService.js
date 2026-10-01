import api from '@/services/api';

export async function getRequestMessages(documentId, signal) {
  const { data } = await api.get(`/documents/${documentId}/messages`, { timeout: 15000, signal });
  if (!Array.isArray(data) || data.some(row => !row.id || typeof row.message !== 'string' || !row.sender_id)) throw new Error('Invalid conversation response.');
  return data;
}
export async function sendRequestMessage(documentId, message) {
  // Sending is not retried automatically: an interrupted response can still mean the server saved it.
  const { data } = await api.post(`/documents/${documentId}/messages`, { message }, { timeout: 15000 });
  return data?.sent || null;
}
export async function getMessageThreads(page, signal) {
  const { data } = await api.get('/documents/messages/threads', { params: { page, limit: 20 }, timeout: 15000, signal });
  if (!Array.isArray(data?.threads) || !Number.isFinite(Number(data.total)) || data.threads.some(row => !row.id)) throw new Error('Invalid conversations response.');
  return data;
}
