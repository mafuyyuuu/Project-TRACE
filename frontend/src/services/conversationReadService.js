import api from '@/services/api';
const paths = {support:'/support/tickets',staff:'/staff-conversations',internal:'/internal-assistance'};
export async function markConversationRead(channel,id,through,signal) {
  if (!Object.hasOwn(paths,channel)) throw new Error('Unknown conversation type.');
  return (await api.post(`${paths[channel]}/${id}/read`,{through},{signal,timeout:15000})).data;
}
