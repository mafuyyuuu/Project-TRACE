import api from '@/services/api';
const base = '/staff-conversations';
export const listRecipients = (params,signal) => api.get(`${base}/recipients`,{params,signal}).then(row=>row.data);
export const listConversations = (before,signal) => api.get(base,{params:{before},signal}).then(row=>row.data);
export const readConversation = (id,before,signal) => api.get(`${base}/${id}`,{params:{before},signal}).then(row=>row.data);
export const openConversation = payload => api.post(base,payload).then(row=>row.data);
export const sendMessage = (id,payload) => api.post(`${base}/${id}/messages`,payload).then(row=>row.data);
