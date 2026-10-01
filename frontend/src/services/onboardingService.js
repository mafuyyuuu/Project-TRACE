import api from '@/services/api';
export async function startFirstLoginGuide() {
  const { data } = await api.post('/auth/onboarding/start', {}, { timeout: 10000 });
  return data.show_guide === true;
}
