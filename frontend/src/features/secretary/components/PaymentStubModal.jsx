import { useEffect, useState } from 'react';
import ModalShell from '@/components/ModalShell';
import QRCode from 'qrcode';
import { formatPeso } from '@/utils/pricing';
import { todayLongDate } from '@/utils/formatters';

/**
 * The payment slip a walk-in student carries to the Finance Office.
 *
 * It exists because the walk-in path otherwise runs entirely outside the
 * system: the student pays at a cashier who has no idea what the request is.
 * The slip is what connects the two, and the QR is what stops three separate
 * people retyping a tracking number like TRC-D55FC1AE by hand.
 *
 * Printed from the browser — `.print-slip` in index.css hides the dashboard
 * behind it so the printer gets the slip and nothing else.
 */
export default function PaymentStubModal({ selectedDoc, groupDocs, setActiveModal }) {
  const [qrSvg, setQrSvg] = useState('');

  const tracking = selectedDoc?.tracking_number;

  useEffect(() => {
    if (!tracking) return;
    let cancelled = false;
    // Rendered as SVG so it stays sharp on paper at any printer resolution.
    QRCode.toString(tracking, { type: 'svg', margin: 0, width: 132 })
      .then((svg) => { if (!cancelled) setQrSvg(svg); })
      // A slip without a QR is still a valid slip — the tracking number is
      // printed beneath it in full, so the counter can always fall back to it.
      .catch(() => { if (!cancelled) setQrSvg(''); });
    return () => { cancelled = true; };
  }, [tracking]);

  if (!selectedDoc) return null;

  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title={null}
      maxWidth="max-w-md"
      backdropClassName="absolute inset-0 bg-gray-900/60 backdrop-blur-md print-hide transition-opacity duration-200"
      panelClassName="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] z-10 border border-gray-100 relative animate-slide-up flex flex-col overflow-hidden print-slip"
      closeButtonClassName="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 print-hide"
      bodyClassName="flex-1 overflow-y-auto px-6 sm:px-8 pt-6 sm:pt-8"
      footerClassName="shrink-0 px-6 sm:px-8 pb-6 sm:pb-8 pt-6 print-hide"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setActiveModal(null)}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white shadow-sm transition-colors"
          >
            Print Slip
          </button>
        </div>
      }
    >
      {/* Slip header */}
      <div className="text-center border-b-2 border-gray-900 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          Pamantasan ng Lungsod ng Pasig
        </p>
        <h3 className="text-lg font-black text-gray-900 mt-1">ORDER OF PAYMENT</h3>
        <p className="text-[10px] text-gray-500 font-semibold mt-1">Office of the Registrar</p>
      </div>

      {/* The machine-readable half */}
      <div className="flex flex-col items-center py-6 border-b border-dashed border-gray-300">
        {qrSvg ? (
          <div className="w-[132px] h-[132px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        ) : (
          <div className="w-[132px] h-[132px] bg-gray-100 rounded flex items-center justify-center">
            <span className="text-[10px] text-gray-400 text-center px-2">QR unavailable</span>
          </div>
        )}
        <p className="font-mono text-base font-black text-gray-900 tracking-wider mt-3 select-text">{tracking}</p>
        <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Present this slip at the Finance Office</p>
      </div>

      {/* Who it belongs to */}
      <div className="py-4 space-y-1.5 text-[11px] font-mono text-gray-600 border-b border-dashed border-gray-300">
        <div className="flex justify-between"><span>Student</span><span className="font-bold text-gray-900">{selectedDoc.student_name || '—'}</span></div>
        <div className="flex justify-between"><span>Student ID</span><span className="font-bold text-gray-900">{selectedDoc.student_id || '—'}</span></div>
        <div className="flex justify-between"><span>Date issued</span><span className="font-bold text-gray-900">{todayLongDate()}</span></div>
      </div>

      {/* What is being charged. Every document in the request, because the
          student pays for the request once. */}
      <div className="py-4 border-b-2 border-gray-900">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Documents</p>
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex justify-between text-[11px]">
              <span className="text-gray-700">
                {d.document_type}
                {d.copies > 1 && <span className="text-gray-400"> × {d.copies}</span>}
                {d.page_count ? <span className="text-gray-400 font-mono"> · {d.page_count}p</span> : null}
              </span>
              <span className="font-mono font-bold text-gray-900">{formatPeso(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center py-4">
        <span className="text-xs font-black uppercase tracking-widest text-gray-900">Total Due</span>
        <span className="font-mono text-xl font-black text-gray-900">{formatPeso(total)}</span>
      </div>

      <p className="text-[10px] text-gray-500 leading-relaxed border-t border-gray-200 pt-4">
        Pay at the Finance Office and keep the Official Receipt. Present the receipt at Window 1
        to collect your documents. You may also pay online from your TRACE dashboard instead.
      </p>
    </ModalShell>
  );
}
