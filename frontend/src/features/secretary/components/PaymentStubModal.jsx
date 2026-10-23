import FinanceIcon from '@/features/finance/components/FinanceIcon';
import Button from '@/components/Button';
import FeeBreakdown from '@/components/FeeBreakdown';
import usePaymentSlip from '@/hooks/usePaymentSlip';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';
import { todayLongDate } from '@/utils/formatters';
import { renderTemplateValues } from '@/utils/templateValues';

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
export default function PaymentStubModal({ selectedDoc, groupDocs, setActiveModal, onBack }) {
  const tracking = selectedDoc?.tracking_number;
  const { qrSvg, template } = usePaymentSlip(tracking);

  if (!selectedDoc) return null;

  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  let printHtml = '';
  if (template && template.content) {
    const docList = items.map(d => `${d.document_type} (P${parseFloat(d.amount).toFixed(2)})`).join(', ');
    printHtml = renderTemplateValues(template.content, {
      STUDENT_NAME: selectedDoc.student_name || '—', STUDENT_ID: selectedDoc.student_id || '—',
      DOCUMENT_TYPE: docList, OR_NUMBER: tracking, TRACKING_NUMBER: tracking, AMOUNT: formatPeso(total),
      PROGRAM_COURSE: selectedDoc.program || 'Not entered', DATE_ISSUED: todayLongDate(),
      REQUEST_SEQUENCE: items.map(doc => doc.document_sequence_number || 'Historical sequence not recorded').join(', '),
    });
  }

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="View Payment Slip"
      subtitle="Official slip to present at the Finance Office"
      headerClassName="trace-modal-header print-hide"
      maxWidth="max-w-md"
      backdropClassName="absolute inset-0 bg-gray-900/60 backdrop-blur-md print-hide transition-opacity"
      panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog trace-payment-slip max-w-[640px] print-slip"
      closeButtonClassName="trace-icon-button absolute top-[26px] right-[24px] print-hide"
      closeButtonIcon={<FinanceIcon name="04f2e" />}
      bodyClassName="trace-modal-body min-h-0 flex-1 overflow-y-auto p-[24px]"
      footerClassName="trace-modal-footer print-hide"
      footer={
        <div className="trace-actions justify-end">
          {onBack && <Button type="button" onClick={onBack} className="trace-button trace-button-secondary">Back to Payment</Button>}
          <Button
            onClick={() => setActiveModal(null)}
            className="trace-button trace-button-secondary"
          >
            Close
          </Button>
          <Button
            type="button" onClick={() => setTimeout(() => window.print(), 100)}
            className="trace-button trace-button-primary"
          >
            <FinanceIcon name="78fb9" />Print Slip
          </Button>
        </div>
      }
    >
{printHtml ? (
        <>
        <div className="space-y-3 py-4 border-b border-dashed border-gray-300">
          <h3 className="trace-section-title">TRACE · Order of Payment</h3>
          {qrSvg && <div className="mx-auto w-[132px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          <p className="text-center font-mono font-bold select-text">{tracking}</p>
          <p className="text-sm break-words">Program: {selectedDoc.program || 'Not entered'}</p>
          {items.map(doc => <p key={doc.id} className="text-xs break-words">{doc.document_sequence_number || `${doc.document_type}: historical sequence not recorded`}</p>)}
        </div>
        <div
          className="print-slip" 
          style={{ fontFamily: template.font_family, fontSize: template.font_size }}
          dangerouslySetInnerHTML={{ __html: printHtml }} 
        />
        </>
      ) : (
        <>
          <div className="trace-payment-slip-sheet"><header><p>Pamantasan ng Lungsod ng Pasig</p><h3>ORDER OF PAYMENT</h3><span>TRACE · Office of the Registrar</span></header><div className="trace-payment-slip-identity"><div className="trace-payment-slip-qr">{qrSvg?<div dangerouslySetInnerHTML={{__html:qrSvg}} />:<p>QR unavailable</p>}</div><div className="min-w-0 flex-1"><p className="trace-payment-slip-label">Tracking ID</p><strong className="block break-all font-mono text-[1.25rem] select-text">{tracking}</strong><p className="text-[.8125rem] text-slate-500">Present this slip at the Finance Office</p><dl>{[['Student',selectedDoc.student_name || '—'],['Student ID',selectedDoc.student_id || '—'],['Program',selectedDoc.program || 'Not entered'],['Date issued',todayLongDate()]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></div><section className="trace-payment-slip-documents"><h4 className="trace-payment-slip-label">Documents</h4>{items.map(row=><div key={row.id}><div><strong>{row.document_type}</strong>{row.copies>1 && <span> × {row.copies}</span>}{row.page_count && <span> · {row.page_count}p</span>}{row.document_sequence_number && <p>{row.document_sequence_number}</p>}</div><strong className="font-mono">{formatPeso(row.amount)}</strong></div>)}</section><div className="trace-payment-slip-total"><strong>Total due</strong><strong>{formatPeso(total)}</strong></div><section className="space-y-3"><h4 className="trace-payment-slip-label">How the amount was worked out</h4>{items.map(row=><div key={row.id}><h5 className="text-[.875rem] font-semibold">{row.document_type}</h5><FeeBreakdown breakdown={row.fee_breakdown} amount={row.amount} /></div>)}</section><p className="trace-payment-slip-notice"><FinanceIcon name="44c1e" /><span>Pay at the Finance Office and keep the Official Receipt. Present the receipt at Window 1 to collect your documents. You may also pay online from your TRACE dashboard instead.</span></p></div>
        </>
      )}
      {printHtml && <div className="space-y-4 py-4">{items.map(doc => <div key={doc.id}>
        <h4 className="text-xs font-bold">{doc.document_type}</h4>
        <FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} />
      </div>)}</div>}
    </ModalShell>
  );
}
