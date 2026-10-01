import api from '@/services/api';
const options = { timeout: 15000 };
export async function getAuthenticator(signal) {
  const { data } = await api.get('/auth/authenticator', { ...options, signal });
  if (typeof data?.enabled !== 'boolean' || typeof data?.available !== 'boolean') throw new Error('Invalid authenticator status');
  return data;
}
export async function beginAuthenticator(current_password) {
  const { data } = await api.post('/auth/authenticator/setup', { current_password }, options);
  if (!data?.secret || !data.provisioning_uri?.startsWith('otpauth://totp/')) throw new Error('Invalid authenticator setup response');
  return data;
}
export async function updateAuthenticator(action, payload) {
  const path = { enable: 'confirm', disable: 'disable', regenerate: 'recovery-codes' }[action];
  if (!path) throw new Error('Invalid authenticator action');
  const { data } = await api.post(`/auth/authenticator/${path}`, payload, options);
  if (!data?.token || !data.user || typeof data.enabled !== 'boolean') throw new Error('Could not confirm updated authenticator settings. Reopen Security to check its status.');
  return data;
}
