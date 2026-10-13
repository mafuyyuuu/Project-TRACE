import api from '@/services/api';
const base = '/internal-assistance';
export const listTickets = (params,signal) => api.get(base,{params,signal}).then(row => row.data);
export const readTicket = (id,before,signal) => api.get(`${base}/${id}`,{params:{before},signal}).then(row => row.data);
export const createTicket = payload => api.post(base,payload).then(row => row.data);
export const sendMessage = (id,payload) => api.post(`${base}/${id}/messages`,payload).then(row => row.data);
export const changeTicket = (id,payload) => api.post(`${base}/${id}/actions`,payload).then(row => row.data);
