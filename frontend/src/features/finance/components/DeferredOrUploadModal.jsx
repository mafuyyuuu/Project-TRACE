import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FinanceReceiptFile from './FinanceReceiptFile';
import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';
import { SecretaryAvatar } from '@/features/secretary/components/SecretaryCaseSummary';
import { formatPeso } from '@/utils/pricing';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DeferredOrUploadModal({
  selectedDoc,
  setActiveModal,
  handleDeferredUpload,
  actionLoading, uploadProgress
}) {
  const [orFile, setOrFile] = useState(null);
  const [fileToConfirm, setFileToConfirm] = useState(null);
  const [orNumber, setOrNumber] = useState(selectedDoc.or_number || '');
  const [orDate, setOrDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orFile) return;
    if (!selectedDoc.or_number && (!orNumber.trim() || !orDate)) return;
    setFileToConfirm({ file: orFile, orNumber: orNumber.trim(), orDate });
  };

  return (
    <>
    <ModalShell open={true} onClose={() => {if(!actionLoading)setActiveModal(null);}} title="Attach Official Receipt Copy" subtitle={'Upload the Official Receipt for Tracking ID #'+(selectedDoc.tracking_number || selectedDoc.id)} headerIcon={<FinanceHeaderIcon name="cd110" />} closeButtonIcon={<FinanceIcon name="b80f9" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog max-w-[560px]" busy={actionLoading} closeOnBackdrop={!actionLoading} closeOnEsc={!actionLoading}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button type="button" disabled={actionLoading} onClick={() => setActiveModal(null)}
            className="trace-button trace-button-secondary">Cancel</Button>
          <Button type="submit" form="deferred-or-form" disabled={actionLoading || !orFile}
            className="trace-button trace-button-primary">
            <FinanceIcon name="f15ad" />{actionLoading ? 'Uploading...' : 'Upload Receipt'}
          </Button>
        </div>
      }>
      <form id="deferred-or-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="trace-finance-upload-student"><SecretaryAvatar name={selectedDoc.student_name} /><div><strong>{selectedDoc.student_name || selectedDoc.student_id}</strong><p>{selectedDoc.document_type}</p></div><div className="text-right font-mono"><p>{selectedDoc.or_number || 'Issuance pending'}</p><strong>{formatPeso(selectedDoc.amount)}</strong></div></div>
        {!selectedDoc.or_number && <>
          <p className="text-sm">Issue the actual OR, upload its copy, and send it to Secretary for release with the document.</p>
          {selectedDoc.or_earliest_issue_date && <p className="text-sm">Earliest eligible issue date: {selectedDoc.or_earliest_issue_date}. This is not a promised deadline.</p>}
          <label className="trace-label block">OR number<input required maxLength={INPUT_LIMITS.receiptNumber} value={orNumber} onChange={e => setOrNumber(e.target.value)} className="trace-control block w-full" /></label>
          <label className="trace-label block">Actual issue date (Manila)<input required type="date" value={orDate} onChange={e => setOrDate(e.target.value)} className="trace-control block w-full" /></label>
        </>}
        <div><div className="trace-actions justify-between mb-2"><h4 className="trace-label">Official POS Receipt</h4><span className="trace-finance-optional">Official Receipt scan</span></div><FinanceReceiptFile label="Official POS Receipt" file={orFile} onChange={setOrFile} disabled={actionLoading} /><p className="trace-admin-caption mt-2 flex items-start gap-2"><FinanceIcon name="a2311" />Missing a digital copy does not remove the recorded OR number.</p></div>
        {actionLoading && <p role="status">{uploadProgress == null ? 'Publishing receipt…' : uploadProgress<100 ? `Uploading ${uploadProgress}%` : 'Upload sent; saving receipt…'}</p>}
      </form>
    </ModalShell>
    <ConfirmDialog open={!!fileToConfirm} title="Upload Official Receipt Copy"
      message={fileToConfirm ? `Upload ${fileToConfirm.file.name} for ${selectedDoc.or_number || selectedDoc.tracking_number || selectedDoc.id}? This preserves the payment and document stage.` : ''}
      confirmLabel="Confirm Upload" loadingLabel="Uploading…" loading={actionLoading}
      onCancel={() => setFileToConfirm(null)}
      onConfirm={async () => {
        if (await handleDeferredUpload(selectedDoc, fileToConfirm.file, fileToConfirm)) setFileToConfirm(null);
      }} />
    </>
  );
}
