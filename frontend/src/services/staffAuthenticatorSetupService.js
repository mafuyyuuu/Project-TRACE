import api from '@/services/api';
const options = { timeout: 15000 };
export async function issueStaffSetup(id, current_password) {
  const { data } = await api.post(`/auth/staff-authenticator/${id}/issue`, { current_password }, options);
  if (!/^[a-f0-9]{64}$/i.test(data?.setup_code) || !data.expires_at) throw new Error('Could not confirm the setup code. Please retry.');
  return data;
}
export async function startStaffSetup(payload) {
  const { data } = await api.post('/auth/staff-authenticator/start', payload, options);
  if (!data?.secret || !data.provisioning_uri?.startsWith('otpauth://totp/')) throw new Error('Could not confirm setup. Please retry.');
  return data;
}
export async function confirmStaffSetup(payload) {
  const { data } = await api.post('/auth/staff-authenticator/confirm', payload, options);
  if (!data?.token || data.user?.role !== 'clerk' || data.enabled !== true || !Array.isArray(data.recovery_codes)) throw new Error('Could not confirm enrollment. Check with Admin before retrying.');
  return data;
}
