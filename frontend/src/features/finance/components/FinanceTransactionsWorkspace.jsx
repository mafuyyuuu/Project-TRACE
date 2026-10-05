import { useState } from 'react';
import DashboardAlerts from '@/components/DashboardAlerts';
import StudentProfileModal from '@/components/StudentProfileModal';
import useFinanceTransactions from '@/hooks/useFinanceTransactions';
import FinanceTransactionsPanel from '@/features/finance/components/FinanceTransactionsPanel';
import DeferredOrUploadModal from '@/features/finance/components/DeferredOrUploadModal';

/** Transactions has its own data and receipt actions, independent of desk queues. */
export default function FinanceTransactionsWorkspace({ setViewImageUrl }) {
  const state = useFinanceTransactions();
  const [studentId, setStudentId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  return <div className="trace-page">
    <DashboardAlerts success={state.receiptFeedback.success} error={state.receiptFeedback.error} onDismiss={state.dismissReceiptFeedback} />
    <FinanceTransactionsPanel state={state} onProfile={setStudentId} onUpload={setSelectedDoc} onViewReceipt={setViewImageUrl} />
    {selectedDoc && <DeferredOrUploadModal key={selectedDoc.id} selectedDoc={selectedDoc} setActiveModal={() => setSelectedDoc(null)} actionLoading={state.uploadingReceipt}
      handleDeferredUpload={async (...args) => {
        const ok = await state.uploadReceipt(...args);
        if (ok) setSelectedDoc(current => current?.id === args[0].id ? null : current);
        return ok;
      }} />}
    <StudentProfileModal open={!!studentId} studentId={studentId} onClose={() => setStudentId(null)} />
  </div>;
}
