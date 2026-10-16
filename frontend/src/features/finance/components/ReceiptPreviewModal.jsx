import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';
import FinanceCard from './FinanceCard';
import {useState} from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import {receiptHtml} from '@/utils/receiptPrint';
import useReceiptPrinting from '@/hooks/useReceiptPrinting';
export default function ReceiptPreviewModal({receipt,config,onClose}) {
 const [mode,setMode]=useState('full');const {frame,busy,error,print}=useReceiptPrinting(receipt.id);
 const tooMany=receipt.snapshot.items.length>12;
 return <ModalShell open title={`Official Receipt ${receipt.serial}`} subtitle={'Issued '+receipt.snapshot.issue_date} headerIcon={<FinanceHeaderIcon name="92c4a" />} closeButtonIcon={<FinanceIcon name="04f2e" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog max-w-[720px]" onClose={()=>!busy&&onClose()} closeOnEsc={!busy} closeOnBackdrop={!busy} footer={<div className="trace-actions"><Button type="button" onClick={onClose} disabled={busy} className="trace-button trace-button-secondary">Close</Button><Button type="button" disabled={busy||receipt.state!=='ISSUED'||tooMany} onClick={()=>print(mode)} className="trace-button trace-button-primary"><FinanceIcon name="78fb9" />{busy?'Preparing…':'Print / Reprint'}</Button></div>}>
  <div className="space-y-3"><p className="trace-finance-notice"><FinanceIcon name="44c1e" />This preview uses the immutable issued details. Printing consumes no new number. A print request is audited; the system cannot confirm physical printer success.</p>
   <label className="trace-label block">Print mode<select disabled={busy} value={mode} onChange={e=>setMode(e.target.value)} className="trace-control block w-full"><option value="full">Full layout — defense preview</option><option value="data-only">Data only — preprinted paper</option></select></label>
   <p className="text-xs">Paper {config.width_mm} × {config.height_mm} mm · Margin {config.margin_mm} mm · Offset {config.offset_x_mm}, {config.offset_y_mm} mm. These are configurable demo dimensions; test on blank paper before using a receipt printer.</p>
   {tooMany&&<p role="alert">This group has more than 12 line items. Review a suitable paper layout before printing.</p>}
   {receipt.state==='VOID'&&<p role="alert" className="text-amber-700 dark:text-amber-300">VOID — this historical snapshot cannot be printed as an issued receipt.</p>}
   {error&&<p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
   <FinanceCard title="Receipt preview" badge={<span className="trace-finance-optional">Read-only</span>}><iframe ref={frame} title="Official Receipt print preview" sandbox="allow-same-origin allow-modals" srcDoc={receiptHtml(receipt.snapshot,config,mode)} className="w-full h-[55dvh] min-h-80 bg-white"/></FinanceCard>
  </div>
 </ModalShell>;
}
