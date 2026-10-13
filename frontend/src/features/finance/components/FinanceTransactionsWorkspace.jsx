import { useState } from 'react';
import DashboardAlerts from '@/components/DashboardAlerts';
import StudentProfileModal from '@/components/StudentProfileModal';
import useFinanceTransactions from '@/hooks/useFinanceTransactions';
import FinanceTransactionsPanel from '@/features/finance/components/FinanceTransactionsPanel';
import DeferredOrUploadModal from '@/features/finance/components/DeferredOrUploadModal';

import useReceiptPack from '@/hooks/useReceiptPack';
import ReceiptIssueModal from './ReceiptIssueModal';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import {receiptError} from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';
/** Transactions has its own data and receipt actions, independent of desk queues. */
export default function FinanceTransactionsWorkspace({ setViewImageUrl }) {
 const actions=useReceiptActions();
  const state = useFinanceTransactions();
  const pack = useReceiptPack();
  const [issue,setIssue]=useState(null),[preview,setPreview]=useState(null),[receiptErrorMessage,setReceiptError]=useState('');
  const refresh=()=>{pack.refresh();state.refresh();};
  async function showReceipt(id){try{setPreview(await actions.read(id));setReceiptError('');}catch(err){setReceiptError(receiptError(err));}}
  const [studentId, setStudentId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  return <div className="trace-page">
    <DashboardAlerts success={state.receiptFeedback.success} error={state.receiptFeedback.error} onDismiss={state.dismissReceiptFeedback} />
    {receiptErrorMessage&&<p role="alert" className="text-red-700 dark:text-red-300">{receiptErrorMessage}</p>}
    <FinanceTransactionsPanel state={state} onProfile={setStudentId} onUpload={row=>row.or_number?setSelectedDoc(row):setIssue(row)} onPrint={showReceipt} onViewReceipt={setViewImageUrl} />
    {issue&&<ReceiptIssueModal key={issue.id} document={issue} onClose={()=>setIssue(null)} onIssued={receipt=>{setIssue(null);setPreview(receipt);refresh();}}/>}
    {preview&&pack.state&&<ReceiptPreviewModal key={preview.id} receipt={preview} config={pack.state.print_config} onClose={()=>setPreview(null)}/>}
    {selectedDoc && <DeferredOrUploadModal key={selectedDoc.id} selectedDoc={selectedDoc} setActiveModal={() => setSelectedDoc(null)} actionLoading={state.uploadingReceipt} uploadProgress={state.uploadProgress}
      handleDeferredUpload={async (...args) => {
        const ok = await state.uploadReceipt(...args);
        if (ok) setSelectedDoc(current => current?.id === args[0].id ? null : current);
        return ok;
      }} />}
    <StudentProfileModal open={!!studentId} studentId={studentId} onClose={() => setStudentId(null)} />
  </div>;
}
