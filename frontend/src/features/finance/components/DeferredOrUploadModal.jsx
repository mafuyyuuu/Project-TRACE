import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

export default function DeferredOrUploadModal({
  selectedDoc,
  setActiveModal,
  handleDeferredUpload,
  actionLoading
}) {
  const [orFile, setOrFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orFile) return;
    handleDeferredUpload(selectedDoc, orFile);
  };

  return (
    <ModalShell open={true} onClose={() => setActiveModal(null)} title="Upload Deferred OR">
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-xs text-gray-600">
          Upload the Official Receipt for Tracking ID <span className="font-mono font-bold">#{selectedDoc.tracking_number || selectedDoc.id}</span>.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
            Official POS Receipt
          </label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, application/pdf"
            required
            onChange={(e) => setOrFile(e.target.files[0])}
            className="p-2 border border-gray-200 rounded-xl w-full text-xs"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={actionLoading || !orFile}
            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {actionLoading ? 'Uploading...' : 'Upload Receipt'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
