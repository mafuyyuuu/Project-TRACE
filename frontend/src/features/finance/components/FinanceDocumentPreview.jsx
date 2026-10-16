import { useRef, useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';
import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';

const zoomClasses = ['w-[50%]','w-[75%]','w-full','w-[125%]','w-[150%]','w-[175%]','w-[200%]'];
export default function FinanceDocumentPreview({ path, serial, onClose }) {
  const file = useAuthedFile(path), name = toFilename(path), stage = useRef(null);
  const [zoom,setZoom] = useState(2), [full,setFull] = useState(false);
  const pdf = name?.toLowerCase().endsWith('.pdf');
  const preview = file.url && (pdf ? <iframe title="Official Receipt PDF copy" src={file.url} className="h-full w-full" /> : <img src={file.url} alt="Official Receipt copy" className={full?'max-w-full max-h-full object-contain':`trace-finance-preview-image ${zoomClasses[zoom]}`} />);
  return <>
    <ModalShell open onClose={onClose} title="Document preview" subtitle="Official Receipt copy attached to this payment." headerIcon={<FinanceHeaderIcon name="c4f0d" />} headerBadge={serial && <span className="trace-finance-receipt-state trace-finance-receipt-issued">{serial}</span>} closeButtonIcon={<FinanceIcon name="b80f9" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog max-w-[760px]" footer={<div className="trace-actions justify-between"><div className="trace-actions min-w-0"><FinanceIcon name="5e248" /><p className="min-w-0 break-all font-mono text-[.75rem] select-text">{name}</p></div>{file.url && <a download={name} href={file.url} className="trace-button trace-button-primary"><FinanceIcon name="5381f" />Download file</a>}</div>}>
      <div ref={stage} className="trace-finance-document-stage"><div className="trace-finance-document-scroll">{file.loading?<p role="status">Loading protected receipt…</p>:file.error?<p role="alert">{file.error}</p>:preview}</div><div className="trace-finance-preview-controls"><Button type="button" disabled={pdf || zoom===0 || !file.url} aria-label="Zoom out" onClick={()=>setZoom(value=>value-1)}><FinanceIcon name="28bed" /></Button><span>{50+zoom*25}%</span><Button type="button" disabled={pdf || zoom===6 || !file.url} aria-label="Zoom in" onClick={()=>setZoom(value=>value+1)}><FinanceIcon name="3ccb3" /></Button><Button type="button" disabled={!file.url} aria-label="Open receipt full size" onClick={()=>setFull(true)}><FinanceIcon name="b62f4" /></Button></div></div>
    </ModalShell>
    <ModalShell open={full} onClose={()=>setFull(false)} title="Official Receipt copy" maxWidth="max-w-6xl"><div className="flex h-[75dvh] items-center justify-center">{preview}</div></ModalShell>
  </>;
}
