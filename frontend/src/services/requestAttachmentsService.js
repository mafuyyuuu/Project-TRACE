import api from '@/services/api';
export async function getAttachmentContext(documentId, signal) {
  const { data } = await api.get(`/documents/${documentId}/attachments`, { signal, timeout: 15000 });
  if (!Array.isArray(data?.requirements) || data.requirements.some(row => !row.id || typeof row.label !== 'string' || !['requested', 'uploaded', 'accepted','rejected'].includes(row.status))) throw new Error('Invalid attachment requirements response.');
  return {...data,types:Array.isArray(data.types) ? data.types : []};
}
export async function getAttachmentRequirements(documentId, signal) { return (await getAttachmentContext(documentId,signal)).requirements; }
export async function saveAttachmentAction(documentId, action) {
  const base = `/documents/${documentId}/attachments`;
  if (action.kind === 'request') return (await api.post(base, { catalog_id: action.catalog_id, replacement_of:action.replacement_of, instructions: action.instructions }, { timeout: 15000 })).data;
  if (action.kind === 'review') return (await api.post(`${base}/${action.id}/review`, { action: action.action, notes: action.notes }, { timeout: 15000 })).data;
  const form = new FormData(); form.append('attachment', action.file);
  return (await api.post(`${base}/${action.id}/upload`, form, { timeout: 30000 })).data;
}

export async function getRequirementHistory({ticketId,documentId,requirementId,before},signal) {
  const url=ticketId ? `/support/tickets/${ticketId}/requirements/${requirementId}/history` : `/documents/${documentId}/attachments/${requirementId}/history`;
  const {data}=await api.get(url,{params:{before},signal,timeout:15000});
  if(!Array.isArray(data?.events)) throw new Error('Invalid requirement history response.');
  return data;
}
