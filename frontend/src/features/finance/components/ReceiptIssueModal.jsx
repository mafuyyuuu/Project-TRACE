import {useRef,useState} from 'react';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import useReceiptPack from '@/hooks/useReceiptPack';
import ReceiptPackControl from './ReceiptPackControl';
import {receiptError} from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';
export default function ReceiptIssueModal({document,onClose,onIssued}) {
 const actions=useReceiptActions();
 const pack=useReceiptPack(),key=useRef(crypto.randomUUID());
 const [name,setName]=useState(document.student_name||''),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function confirm(){setBusy(true);setError('');try{const receipt=await actions.issue(document.id,{...review,client_key:key.current});onIssued(receipt);}catch(err){setError(receiptError(err));}finally{setBusy(false);}}
 return <>
  <ModalShell open title="Issue Official Receipt" onClose={()=>!busy&&onClose()} closeOnBackdrop={!busy} closeOnEsc={!busy} footer={<Button type="button" disabled={busy||!pack.state?.pack?.next_serial||!name.trim()} className="trace-button trace-button-primary" onClick={()=>setReview({expected_pack_id:pack.state.pack.id,expected_serial:pack.state.pack.next_serial,payor_name:name.trim()})}>Review Issuance</Button>}>
   <div className="space-y-4"><p className="text-sm">Payment is already cleared. Issuance consumes one number. Previewing, printing or uploading a copy consumes none.</p><p className="font-mono select-text">{document.request_group_id}</p>
    <ReceiptPackControl packState={pack.state} onChanged={pack.refresh}/>
    <label className="trace-label block">Payor name — Last, First M.I.<input value={name} maxLength={255} onChange={e=>setName(e.target.value)} className="trace-control block w-full"/><span className="text-xs">Review the actual name; the account profile will remain unchanged.</span></label>
    <Button type="button" className="trace-button trace-button-secondary" onClick={pack.refresh}>Refresh next number</Button>
    {(pack.error||(!review&&error))&&<p role="alert" className="text-red-700 dark:text-red-300">{pack.error||error}</p>}
   </div>
  </ModalShell>
  <ConfirmDialog open={!!review} title="Confirm receipt issuance" message={review?[`Issue ${review.expected_serial} to ${review.payor_name}?`,'This saves the payment details and cashier name permanently. Upload its copy afterward.']:[]} loading={busy} onCancel={()=>setReview(null)} onConfirm={confirm} confirmLabel="Issue Receipt">
   {error&&<p role="alert" className="text-red-700 dark:text-red-300 mt-3">{error} For a changed serial, cancel and refresh before reviewing again.</p>}
  </ConfirmDialog>
 </>;
}
