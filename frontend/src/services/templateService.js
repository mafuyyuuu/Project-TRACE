import api from '@/services/api';
export const getTemplates = options => api.get('/templates', options);
export const getTemplate = (key, options) => api.get(`/templates/${encodeURIComponent(key)}`, options);
export const saveTemplate = (key, payload) => api.put(`/templates/${encodeURIComponent(key)}`, payload);
