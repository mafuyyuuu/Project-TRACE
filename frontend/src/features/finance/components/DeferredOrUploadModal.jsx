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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orFile) return;
    setFileToConfirm(orFile);
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

        <div className="flex flex-col gap-2">
          <label htmlFor="deferred-or-file" className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
            Official POS Receipt
          </label>
          <FileUploadField id="deferred-or-file" label="Official Receipt scan" file={orFile} path={selectedDoc?.official_receipt_path} onChange={setOrFile} disabled={actionLoading} />
        </div>

      </form>
    </ModalShell>
    <ConfirmDialog open={!!fileToConfirm} title="Upload Official Receipt Copy"
      message={fileToConfirm ? `Upload ${fileToConfirm.name} for ${selectedDoc.or_number || selectedDoc.tracking_number || selectedDoc.id}? This preserves the payment and document stage.` : ''}
      confirmLabel="Confirm Upload" loadingLabel="Uploading…" loading={actionLoading}
      onCancel={() => setFileToConfirm(null)}
      onConfirm={async () => {
        if (await handleDeferredUpload(selectedDoc, fileToConfirm)) setFileToConfirm(null);
      }} />
    </>
  );
}
