import api from '@/services/api';
export async function getAttachmentRequirements(documentId, signal) {
  const { data } = await api.get(`/documents/${documentId}/attachments`, { signal, timeout: 15000 });
  if (!Array.isArray(data?.requirements) || data.requirements.some(row => !row.id || typeof row.label !== 'string' || !['requested', 'uploaded', 'accepted'].includes(row.status))) throw new Error('Invalid attachment requirements response.');
  return data.requirements;
}
export async function saveAttachmentAction(documentId, action) {
  const base = `/documents/${documentId}/attachments`;
  if (action.kind === 'request') return (await api.post(base, { label: action.label, instructions: action.instructions }, { timeout: 15000 })).data;
  if (action.kind === 'review') return (await api.post(`${base}/${action.id}/review`, { action: action.action, notes: action.notes }, { timeout: 15000 })).data;
  const form = new FormData(); form.append('attachment', action.file);
  return (await api.post(`${base}/${action.id}/upload`, form, { timeout: 30000 })).data;
}
