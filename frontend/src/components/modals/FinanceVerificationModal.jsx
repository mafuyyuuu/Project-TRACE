import { useState } from 'react';
import { createPortal } from 'react-dom';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export default function FinanceVerificationModal({ 
  setActiveModal, 
  selectedDoc, 
  setViewImageUrl, 
  triggerNotification, 
  handleFinanceVerify, 
  actionLoading,
  clerkNotes,
  setClerkNotes
}) {
  const [financeReceiptFile, setFinanceReceiptFile] = useState(null);

  if (!selectedDoc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-200 relative">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
        
        <h3 className="text-xl font-black text-gray-900 mb-6">Verification Details</h3>
        
        {/* Gray detail panel */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
          <div className="flex justify-between"><span>Name</span><span className="font-bold text-gray-950">{selectedDoc.student_name || 'Unknown'}</span></div>
          <div className="flex justify-between"><span>Document Type</span><span className="font-bold text-gray-950">{selectedDoc.document_type}</span></div>
          <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
          <div className="flex justify-between"><span>Date Paid</span><span className="font-bold text-gray-950">{new Date(selectedDoc.updated_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">{selectedDoc.copies || 1}</span></div>
          <div className="flex justify-between border-t border-gray-200/50 pt-2"><span>Amount</span><span className="font-bold text-gray-950">P{parseFloat(selectedDoc.amount || 150).toFixed(2)}</span></div>
        </div>

        <div className="space-y-4">
          <span className="text-xs font-black text-gray-900 block">Gcash Receipt Screenshot</span>
          
          {/* Receipt Preview */}
          <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 h-64 relative flex items-center justify-center">
            {selectedDoc.receipt_image_path ? (
              selectedDoc.receipt_image_path.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={`${apiBaseUrl}/uploads/${selectedDoc.receipt_image_path.split(/[\\/]/).pop()}`} 
                  className="w-full h-full"
                  title="PDF Receipt"
                />
              ) : (
                <div onClick={() => setViewImageUrl(selectedDoc.receipt_image_path)} className="cursor-zoom-in w-full h-full flex items-center justify-center">
                  <img 
                    src={`${apiBaseUrl}/uploads/${selectedDoc.receipt_image_path.split(/[\\/]/).pop()}`} 
                    alt="Payment Receipt" 
                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                  />
                </div>
              )
            ) : (
              <span className="text-xs text-gray-400">No Image Uploaded</span>
            )}
          </div>

          <div className="text-center font-bold text-xs text-gray-800 py-2 border-b border-gray-100 mb-2">
            GCash Reference Number: <span className="font-mono text-gray-600 font-bold">{selectedDoc.gcash_reference_no || 'None'}</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
              Attach Official POS Receipt <span className="text-red-500">*</span>
            </label>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp, application/pdf"
              required
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size > 5 * 1024 * 1024) {
                  triggerNotification('File size exceeds 5MB limit.', 'error');
                  e.target.value = '';
                  setFinanceReceiptFile(null);
                  return;
                }
                setFinanceReceiptFile(file);
              }}
              className="w-full bg-red-50/50 border border-red-100 rounded-xl p-3 text-xs font-bold text-red-600 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer transition-colors" 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Clerk Notes / Remarks</label>
          <textarea
            value={clerkNotes}
            onChange={(e) => setClerkNotes(e.target.value)}
            placeholder="Add notes (required for rejection)..."
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button 
            onClick={() => handleFinanceVerify('reject', null)}
            disabled={actionLoading}
            className="w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            Reject Payment
          </button>
          <button 
            onClick={() => handleFinanceVerify('approve', financeReceiptFile)}
            disabled={actionLoading || !financeReceiptFile}
            className={`w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider ${
              !financeReceiptFile ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#15803d] hover:bg-[#166534] text-white'
            }`}
          >
            Verify Payment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
