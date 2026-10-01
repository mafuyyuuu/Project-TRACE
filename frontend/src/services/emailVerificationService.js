import api from '@/services/api';
export async function resendVerification(options = {}) {
  const { data } = await api.post('/auth/email-verification/resend', options, { timeout: 15000 });
  return data;
}
export async function confirmVerification(token) {
  const { data } = await api.post('/auth/email-verification/confirm', { token }, { timeout: 15000 });
  return data;
}
