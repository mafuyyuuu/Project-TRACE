import api from '@/services/api';

/** Public advisory check; final registration and the unique index stay authoritative. */
export async function checkRegistrationId(employeeId, signal) {
  const { data } = await api.post('/auth/registration-id-check', { employee_id: employeeId }, { signal, timeout: 15000 });
  if (typeof data?.available !== 'boolean') throw new Error('Invalid ID check response.');
  return data;
}
