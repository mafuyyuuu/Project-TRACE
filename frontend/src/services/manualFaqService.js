import api from '@/services/api';
export async function getManualFeedback(signal){
  const {data}=await api.get('/manual-faq',{signal,timeout:15000});
  if(!Array.isArray(data?.feedback) || data.feedback.some(row=>typeof row?.question!=='string' || !['helpful','not_helpful'].includes(row.action) || row.suggestion!=null && typeof row.suggestion!=='string'))throw new Error('Invalid saved FAQ feedback.');
  return data.feedback;
}
export async function recordManualFaq(payload,signal){
  const {data}=await api.post('/manual-faq',payload,{signal,timeout:15000});
  if(data?.saved!==true)throw new Error('FAQ feedback was not acknowledged.');
}
