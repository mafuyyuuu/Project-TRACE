import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DeferredOrUploadModal({
  selectedDoc,
  setActiveModal,
  handleDeferredUpload,
  actionLoading
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
    <ModalShell open={true} onClose={() => setActiveModal(null)} title="Upload Deferred OR"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button type="button" disabled={actionLoading} onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-bold">Cancel</button>
          <button type="submit" form="deferred-or-form" disabled={actionLoading || !orFile}
            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold disabled:opacity-50">
            {actionLoading ? 'Uploading...' : 'Upload Receipt'}
          </button>
        </div>
      }>
      <form id="deferred-or-form" onSubmit={handleSubmit} className="space-y-6">
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Upload the Official Receipt for Tracking ID <span className="font-mono font-bold">#{selectedDoc.tracking_number || selectedDoc.id}</span>.
        </p>

        {!selectedDoc.or_number && <>
          <p className="text-sm">Issue the actual OR, upload its copy, and send it to Secretary for release with the document.</p>
          {selectedDoc.or_earliest_issue_date && <p className="text-sm">Earliest eligible issue date: {selectedDoc.or_earliest_issue_date}. This is not a promised deadline.</p>}
          <label className="block text-sm font-semibold">OR number<input required maxLength={INPUT_LIMITS.receiptNumber} value={orNumber} onChange={e => setOrNumber(e.target.value)} className="block w-full border rounded-xl p-3 bg-transparent" /></label>
          <label className="block text-sm font-semibold">Actual issue date (Manila)<input required type="date" value={orDate} onChange={e => setOrDate(e.target.value)} className="block w-full border rounded-xl p-3 bg-transparent" /></label>
        </>}
        <div className="flex flex-col gap-2">
          <label htmlFor="deferred-or-file" className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
            Official POS Receipt
          </label>
          <FileUploadField id="deferred-or-file" label="Official Receipt scan" file={orFile} path={selectedDoc?.official_receipt_path} onChange={setOrFile} disabled={actionLoading} />
        </div>

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
