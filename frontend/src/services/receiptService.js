import api from '@/services/api';
const root='/documents/finance';
export const receiptState=async()=> (await api.get(`${root}/receipt-packs`,{timeout:15000})).data;
export const previewPack=async(body)=> (await api.post(`${root}/receipt-packs/preview`,body,{timeout:15000})).data;
export const savePack=async(body)=> (await api.post(`${root}/receipt-packs`,body,{timeout:15000})).data;
export const receiptHistory=async()=> (await api.get(`${root}/receipt-history`,{timeout:15000})).data;
export const issueReceipt=async(id,body)=> (await api.post(`${root}/${id}/issue-receipt`,body,{timeout:15000})).data;
export const readReceipt=async(id)=> (await api.get(`${root}/receipts/${id}`,{timeout:15000})).data;
export const requestReceiptPrint=async(id,body)=> (await api.post(`${root}/receipts/${id}/print`,body,{timeout:15000})).data;
export const voidReceipt=async(id,body)=> (await api.post(`${root}/receipts/${id}/void`,body,{timeout:15000})).data;
export const savePrintSettings=async(body)=> (await api.put(`${root}/receipt-print-settings`,body,{timeout:15000})).data;
export async function uploadReceiptCopy(id,file,onProgress) {
 const body=new FormData();body.append('officialReceipt',file);
 return (await api.post(`${root}/receipts/${id}/copy`,body,{timeout:60000,onUploadProgress:event=>onProgress?.(event.total ? Math.round(event.loaded*100/event.total) : null)})).data;
}
export const receiptError=error=>error.response?.data?.error || error.message || 'Receipt action failed. Retry or refresh to review.';
