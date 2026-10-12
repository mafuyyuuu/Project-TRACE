import {useState} from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import useReceiptHistory from '@/hooks/useReceiptHistory';
import {receiptError} from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';
import ReceiptPackControl from './ReceiptPackControl';
export default function ReceiptTools({pack,onPreview,onChanged}) {
 const actions=useReceiptActions();
 const history=useReceiptHistory(pack.state),[settings,setSettings]=useState(null),[target,setTarget]=useState(null),[reason,setReason]=useState(''),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){setBusy(true);setError('');try{if(review.kind==='settings')await actions.saveSettings(review.body);else await actions.void(review.id,{reason:review.reason});setReview(null);setSettings(null);setTarget(null);onChanged();}catch(err){setError(receiptError(err));}finally{setBusy(false);}}
 return <section className="trace-section p-4 sm:p-6 space-y-4" aria-label="Receipt paper packs and print settings">
  <div className="flex flex-wrap items-start justify-between gap-4"><ReceiptPackControl packState={pack.state} onChanged={onChanged}/><div className="trace-actions"><Button type="button" onClick={onChanged} className="trace-button trace-button-secondary">Refresh receipts</Button><Button type="button" disabled={!pack.state} onClick={()=>setSettings({...pack.state.print_config})} className="trace-button trace-button-secondary">Printer calibration</Button></div></div>
  {(pack.error||history.error)&&<p role="alert" className="text-red-700 dark:text-red-300">{pack.error||history.error}</p>}
  <details><summary className="trace-action cursor-pointer font-semibold">Issued receipt and pack history</summary><div className="space-y-3 pt-3">
   {history.data?.receipts?.map(receipt=><div key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3"><div className="min-w-0"><strong className="font-mono break-all select-text">{receipt.serial}</strong><p className="text-xs">{receipt.state} · {receipt.snapshot.payor_name} · {receipt.snapshot.issue_date} · {receipt.snapshot.cashier_name}</p></div><div className="trace-actions"><Button type="button" className="trace-button trace-button-secondary" onClick={()=>onPreview(receipt)}>View snapshot</Button>{receipt.state==='ISSUED'&&<Button type="button" className="trace-button trace-button-danger" onClick={()=>{setTarget(receipt);setReason('');}}>Void</Button>}</div></div>)}
   {history.data?.packs?.map(item=><p key={item.id} className="text-sm break-words font-mono">Pack #{item.id}: {item.start_serial} · {item.consumed}/50 · {item.active?'Active':'Archived'}</p>)}
   {!history.data&&<p>Loading receipt history…</p>}
  </div></details>
  {settings&&<ModalShell open title="Printer calibration" onClose={()=>!busy&&setSettings(null)} footer={<Button type="button" className="trace-button trace-button-primary" onClick={()=>setReview({kind:'settings',body:{print_config:settings,version:pack.state.version}})}>Review Settings</Button>}><p className="text-sm mb-4">Measure the actual blank paper. Save dimensions and global alignment; test the data-only preview with the printer's scale set to 100%.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(settings).map(([field,value])=><label key={field} className="trace-label">{field.replaceAll('_',' ')}<input type="number" step="0.1" value={value} onChange={e=>setSettings({...settings,[field]:e.target.value})} className="trace-control block w-full"/></label>)}</div></ModalShell>}
  {target&&<ModalShell open title={`Void ${target.serial}?`} onClose={()=>!busy&&setTarget(null)} footer={<Button type="button" disabled={!reason.trim()} className="trace-button trace-button-danger" onClick={()=>setReview({kind:'void',id:target.id,serial:target.serial,reason})}>Review Void</Button>}><p className="text-sm mb-4">Allowed only before Secretary OR verification and handoff. The paid payment remains intact; this serial stays consumed. A replacement uses a new number.</p><label className="trace-label block">Reason<textarea maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} className="trace-control block w-full"/></label></ModalShell>}
  <ConfirmDialog open={!!review} title={review?.kind==='void'?'Confirm receipt void':'Save printer calibration'} variant={review?.kind==='void'?'destructive':'neutral'} message={review?.kind==='void'?`Void ${review.serial}? Reason: ${review.reason}`:review?Object.entries(review.body.print_config).map(([key,value])=>`${key.replaceAll('_',' ')}: ${value}`):''} loading={busy} onCancel={()=>setReview(null)} onConfirm={save}>{error&&<p role="alert" className="text-red-700 dark:text-red-300 mt-3">{error}</p>}</ConfirmDialog>
 </section>;
}
