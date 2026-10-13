import {useRef,useState} from 'react';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import useReceiptPack from '@/hooks/useReceiptPack';
import ReceiptPackControl from './ReceiptPackControl';
import {receiptError} from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';
import { receiptStudentName } from '@/utils/receiptStudentName';
export default function ReceiptIssueModal({document,onClose,onIssued}) {
 const actions=useReceiptActions();
 const pack=useReceiptPack(),key=useRef(crypto.randomUUID());
 const name=receiptStudentName(document);
 const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function confirm(){setBusy(true);setError('');try{const receipt=await actions.issue(document.id,{...review,client_key:key.current});onIssued(receipt);}catch(err){setError(receiptError(err));pack.refresh();}finally{setBusy(false);}}
 return <>
  <ModalShell open title="Issue Official Receipt" onClose={()=>!busy&&onClose()} closeOnBackdrop={!busy} closeOnEsc={!busy} footer={<Button type="button" disabled={busy||!pack.state?.pack?.next_serial||!name.trim()} className="trace-button trace-button-primary" onClick={()=>setReview({expected_pack_id:pack.state.pack.id,expected_serial:pack.state.pack.next_serial})}>Review Issuance</Button>}>
   <div className="space-y-4"><p className="text-sm">Payment is already cleared. Issuance consumes one number. Previewing, printing or uploading a copy consumes none.</p><p className="font-mono select-text">{document.request_group_id}</p>
    <ReceiptPackControl packState={pack.state} onChanged={pack.refresh}/>
    <p className="text-sm select-text"><span className="font-semibold">Student / Payor:</span> {name || 'Student name not recorded'}</p>
    {(pack.error||(!review&&error))&&<p role="alert" className="text-red-700 dark:text-red-300">{pack.error||error}</p>}
   </div>
  </ModalShell>
  <ConfirmDialog open={!!review} title="Confirm receipt issuance" message={review?[`Issue ${review.expected_serial} to ${name}?`,'This saves the payment details and cashier name permanently. Upload its copy afterward.']:[]} loading={busy} onCancel={()=>setReview(null)} onConfirm={confirm} confirmLabel="Issue Receipt">
   {error&&<p role="alert" className="text-red-700 dark:text-red-300 mt-3">{error} For a changed serial, cancel the confirmation and review the automatically updated number.</p>}
  </ConfirmDialog>
 </>;
}
