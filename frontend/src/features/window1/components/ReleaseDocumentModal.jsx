import { useRef } from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import WindowIcon from './WindowIcon';

/** The release dialog is itself the confirmation; keep Cancel-first focus. */
export default function ReleaseDocumentModal({ document: doc, busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  return <ModalShell open={Boolean(doc)} onClose={onCancel} title="Release Document" subtitle="Confirm the request information before releasing the document." panelClassName="trace-modal-panel trace-admin-main-dialog trace-window-dialog trace-window-release max-w-[880px]" busy={busy} initialFocusRef={cancelRef} closeOnBackdrop={!busy} closeOnEsc={!busy} closeButtonIcon={<WindowIcon name="49a7e"/>} footer={<div className="trace-window-modal-actions"><p><WindowIcon name="f4fe6"/>This action records the document handover.</p><div className="trace-actions"><Button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className="trace-button trace-button-secondary">Cancel</Button><Button type="button" disabled={busy} onClick={onConfirm} className="trace-button trace-button-primary"><WindowIcon name="release"/>{busy ? 'Releasing…' : 'Release'}</Button></div></div>}>
    {doc && <div className="trace-window-release-grid"><section className="trace-window-receipt"><div className="trace-window-receipt-preview">{doc.official_receipt_path ? <AuthedFilePreview path={doc.official_receipt_path} alt="Official Receipt copy" iframeTitle="Official Receipt copy" className="w-full max-h-96 object-contain"/> : <p>No digital receipt on file. The Secretary’s physical receipt check remains valid.</p>}</div><span className="trace-admin-badge trace-admin-badge-green"><WindowIcon name="18446"/>Cleared for release</span></section><dl className="trace-window-release-details">{[['f6902','DOCUMENT',doc.document_type],['e4c27','APPLICANT',doc.student_name || doc.student_id],['ed19b','TRACKING NUMBER',doc.tracking_number || doc.id],['6c57a','OFFICIAL RECEIPT',doc.or_number || 'Recorded physical receipt']].map(([icon,label,value])=><div key={label}><span className="trace-window-detail-icon"><WindowIcon name={icon}/></span><div><dt>{label}</dt><dd className="select-text">{value}</dd></div></div>)}</dl></div>}
  </ModalShell>;
}
