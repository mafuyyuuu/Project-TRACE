import { useRef } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';
import SecretaryIcon, { SecretaryHeaderIcon } from './SecretaryIcon';
import { SecretaryAvatar } from './SecretaryCaseSummary';

export default function SecretaryHandoffModal({ document, busy, onConfirm, onCancel }) {
  const cancel = useRef(null);
  if (!document) return null;
  return <ModalShell open onClose={()=>{if(!busy)onCancel();}} busy={busy} initialFocusRef={cancel} title="Confirm Handoff" headerIcon={<SecretaryHeaderIcon name="f46af" />} headerBadge={<span className="trace-secretary-stage-badge">Step 4 · Final Handoff</span>} closeButtonIcon={<SecretaryIcon name="b80f9" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-secretary-handoff max-w-[480px]"
    footer={<div className="trace-actions justify-end"><Button ref={cancel} type="button" disabled={busy} onClick={onCancel} className="trace-button trace-button-secondary">Cancel</Button><Button type="button" disabled={busy} onClick={onConfirm} className="trace-button trace-button-primary"><SecretaryIcon name="11669" />{busy ? 'Recording…' : 'Confirm Handoff'}</Button></div>}>
    <div className="space-y-4"><p>Confirm you have handed {document.document_type} to Window 1?</p><section className="trace-secretary-case-summary"><div className="trace-secretary-case-identity"><SecretaryAvatar name={document.student_name} /><div className="min-w-0 flex-1"><strong className="block break-words">{document.student_name || 'Unresolved student'}</strong><span className="trace-secretary-row-tracking">#{document.tracking_number || document.id}</span></div><span className="trace-secretary-payment trace-secretary-payment-paid"><SecretaryIcon name="18446" />Paid & signed</span></div><dl className="trace-secretary-handoff-summary">{[['Document',document.document_type],['Amount paid',`${formatPeso(document.amount)} · OR ${document.or_number || 'not recorded'}`],['Handing off to','Window 1']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><p className="trace-secretary-notice"><SecretaryIcon name="0cb6e" />Once confirmed, this document moves to Window 1 for release.</p></div>
  </ModalShell>;
}
