import {useState} from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import {receiptError} from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';
export default function ReceiptPackControl({packState,onChanged}) {
 const actions=useReceiptActions();
 const [open,setOpen]=useState(false),[serial,setSerial]=useState(''),[segment,setSegment]=useState(''),[reason,setReason]=useState('');
 const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pack=packState?.pack;
 async function preview(event) {
  event.preventDefault();setBusy(true);setError('');
  try {const body={start_serial:serial,segment:segment===''?undefined:Number(segment),reason,version:packState.version};setReview({...body,preview:await actions.preview(body)});}
  catch(err){setError(receiptError(err));}finally{setBusy(false);}
 }
 async function confirm(){setBusy(true);setError('');try{await actions.activate(review);setReview(null);setOpen(false);onChanged();}catch(err){setError(receiptError(err));}finally{setBusy(false);}}
 return <>
  <div className="space-y-2">
   <label className="trace-label block">Official Receipt issuance number</label>
   {pack?.next_serial && <input aria-label="Next issuance number" value={pack.next_serial} readOnly className="trace-control w-full font-mono"/>}
   <Button type="button" disabled={!packState} className="trace-button trace-button-secondary" onClick={()=>{setOpen(true);setError('');}}>{!pack?'Input Issuance Number':!pack.next_serial?'Change Issuance Number':'Replace paper pack'}</Button>
   {pack && <p className="text-xs">{pack.consumed} / 50 issued · Last serial: <span className="font-mono select-text">{pack.last_serial}</span></p>}
  </div>
  {open && <ModalShell open title="Configure 50-receipt paper pack" onClose={()=>!busy&&setOpen(false)} closeOnBackdrop={!busy} closeOnEsc={!busy} footer={<Button type="submit" form="receipt-pack-form" disabled={busy} className="trace-button trace-button-primary">Review Pack</Button>}>
   <form id="receipt-pack-form" onSubmit={preview} className="space-y-4">
    <p className="text-sm">Enter the complete first number printed on the new pack. Review the numeric segment to increment; prefixes, separators and zero padding are preserved.</p>
    <label className="trace-label block">First issuance number<input required maxLength={100} value={serial} onChange={e=>setSerial(e.target.value)} className="trace-control block w-full" placeholder="2026-00001"/></label>
    <label className="trace-label block">Numeric segment to increment<select value={segment} onChange={e=>setSegment(e.target.value)} className="trace-control block w-full"><option value="">Auto — only for one numeric segment</option>{[...serial.matchAll(/\d+/g)].map((match,index)=><option key={index} value={index}>Segment {index+1}: {match[0]}</option>)}</select></label>
    {pack && <label className="trace-label block">Reason for replacement<textarea required={Number(pack.consumed)<50} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} className="trace-control block w-full"/><span className="text-xs">Unused numbers in the old pack remain reserved and cannot be recycled.</span></label>}
    <Button type="button" onClick={onChanged} disabled={busy} className="trace-button trace-button-secondary">Refresh saved pack</Button>
    {error && !review && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
   </form>
  </ModalShell>}
  <ConfirmDialog open={!!review} title="Activate paper pack?" message={review?[`First three: ${review.preview.first.join(', ')}`,`50th: ${review.preview.last}. This reserves exactly 50 numbers.`,pack?'The previous pack will be archived. Unused numbers stay reserved.':'No number is consumed until a receipt is issued.']:[]} onCancel={()=>{setReview(null);setError('');}} onConfirm={confirm} loading={busy} confirmLabel="Activate Pack">
   {error&&<p role="alert" className="text-red-700 dark:text-red-300 mt-3">{error} Close this confirmation and refresh the workspace if the configuration changed.</p>}
  </ConfirmDialog>
 </>;
}
