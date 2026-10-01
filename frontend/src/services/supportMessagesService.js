import api from '@/services/api';
export async function getSupportMessages(studentId, signal) {
  const { data } = await api.get(`/support/${studentId}/messages`, { signal, timeout: 15000 });
  if (!Array.isArray(data) || data.some(row => !row.id || !row.sender_id || typeof row.message !== 'string')) throw new Error('Invalid support response.');
  return data;
}
export async function sendSupportMessage(studentId, message) {
  const { data } = await api.post(`/support/${studentId}/messages`, { message }, { timeout: 15000 });
  return data?.id ? data : null;
}
export async function getSupportThreads(page, signal) {
  const { data } = await api.get('/support', { params: { page }, signal, timeout: 15000 });
  if (!Array.isArray(data?.threads) || !Number.isFinite(Number(data.total)) || data.threads.some(row => !row.id)) throw new Error('Invalid support conversations response.');
  return data;
}
