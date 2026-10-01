import api from '@/services/api';
export async function getFinanceTransactions(filters, page, signal) {
  const { data } = await api.get('/documents/finance/transactions', { params: { ...filters, page }, signal, timeout: 15000 });
  if (!Array.isArray(data?.transactions) || !Number.isFinite(data.total) || !Number.isFinite(data.amount)) throw new Error('Invalid payment transaction response.');
  return data;
}
export async function exportFinanceTransactions(filters) {
  const { data } = await api.get('/documents/finance/transactions/export', { params: filters, responseType: 'blob', timeout: 30000 });
  return data;
}
