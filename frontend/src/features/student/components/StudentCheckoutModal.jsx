import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import FileUploadField from '@/components/FileUploadField';
import FeeBreakdown from '@/components/FeeBreakdown';
import ReviewIcon from '@/components/ReviewIcon';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { formatPeso } from '@/utils/pricing';

const methodIcon = method => method.code === 'gcash' ? '5f3dc' : method.provider === 'card' || /card/i.test(method.code) ? 'ccf70' : /bank/i.test(method.code) ? '55f54' : '51fa3';

function CheckoutCharges({ item }) {
  let saved = item.fee_breakdown;
  if (typeof saved === 'string') { try { saved = JSON.parse(saved); } catch { saved = null; } }
  if (!Array.isArray(saved?.items) || saved.fee_pending) return <FeeBreakdown breakdown={saved} amount={item.amount} />;
  return <section className="trace-checkout-charges" aria-label="Fee calculation">
    <dl>{saved.items.map((charge,index) => <div key={index}><div><dt>{charge.label}</dt><dd>{charge.calculation}</dd></div><dd>{formatPeso(charge.amount)}</dd></div>)}</dl>
    <p><ReviewIcon name="a31c5" /><span>{saved.stage === 'estimate' ? 'Estimated charges · actual printed pages determine the final bill' : 'Confirmed charges'} · {saved.source === 'college' ? 'College fee schedule' : 'Default fee schedule'}</span></p>
  </section>;
}

/** Figma checkout composition, using saved charges and configured methods. */
export default function StudentCheckoutModal({ document, documents, methods, selectedMethod, onMethod, reference, onReference, file, onFile, onSubmit, onSlip, onBack, onClose, busy }) {
  const method = methods.find(item => item.code === selectedMethod);
  const total = documents.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return <ModalShell open title="Complete your Payment" subtitle={`Request ${document.request_group_id || document.tracking_number} · ${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`}
    onClose={onClose} busy={busy} closeOnEsc={!busy} closeOnBackdrop={!busy} maxWidth="max-w-[860px]"
    panelClassName="trace-modal-panel trace-student-checkout max-w-[860px]" bodyClassName="trace-modal-body trace-checkout-body"
    headerIcon={<span className="trace-student-modal-heading-icon"><ReviewIcon name="c2452" /></span>} closeButtonClassName="trace-icon-button trace-checkout-close" closeButtonIcon={<ReviewIcon name="04f2e" />}
    footer={<div className="trace-checkout-footer">
      <Button type="button" disabled={busy} onClick={onBack} className="trace-action inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ReviewIcon name="2d52d" />Back to Form</Button>
      <div className="trace-actions"><Button type="button" disabled={busy} onClick={onSlip} className="trace-button trace-button-secondary"><ReviewIcon name="5d87a" />Print Payment Slip (Walk-in)</Button>
      <Button type="submit" form="student-payment-form" disabled={busy || !method} className="trace-button trace-button-primary"><ReviewIcon name="ba71f" />{busy ? 'Submitting...' : 'Submit Payment'}</Button></div>
    </div>}>
    <ol className="trace-checkout-steps" aria-label="Payment progress"><li data-complete><span><ReviewIcon name="7ece8" /></span>Request submitted</li><li aria-current="step"><span>2</span>Payment</li><li><span>3</span>Verification</li></ol>
    <div className="trace-checkout-columns">
      <section className="trace-checkout-methods" aria-label="Payment method">
        <h3 className="trace-checkout-caption">PAYMENT METHOD</h3>
        <div role="group" aria-label="Choose payment method" className="trace-checkout-method-grid">{methods.map(item => <Button key={item.code} type="button" disabled={busy} aria-label={item.name} aria-pressed={selectedMethod === item.code} onClick={() => onMethod(item.code)} className="trace-checkout-method">
          <ReviewIcon name={methodIcon(item)} /><span><strong>{item.name}</strong><small>{item.code === 'gcash' ? 'Manual transfer' : item.provider === 'manual' ? 'Cashier / transfer' : 'Online payment'}</small></span>{selectedMethod === item.code && <span className="trace-checkout-method-check"><ReviewIcon name="a6431" /></span>}
        </Button>)}</div>
        {!methods.length && <p role="alert" className="trace-error">No payment methods are currently available. Contact the Registrar.</p>}
        <section className="trace-checkout-payment">
          <header><h3>PAY WITH {method?.name?.toUpperCase() || 'YOUR SELECTED METHOD'}</h3><span><ReviewIcon name="6582c" />{method?.name || 'Payment'}</span></header>
          <div className="trace-checkout-payment-content">
            {method && selectedMethod === 'gcash' && <><div role="img" aria-label="GCash payment QR placeholder" className="trace-checkout-qr-placeholder"><strong>GCash</strong><span>QR code placeholder</span></div><p>Contact the Finance Office for GCash payment instructions.</p></>}
            <p className="select-text whitespace-pre-wrap break-words">{method?.instructions || 'Complete your payment, then submit proof below.'}</p>
            <dl><div><dt>Amount to pay</dt><dd>{formatPeso(total)}</dd></div><div><dt>Request</dt><dd>{document.request_group_id || document.tracking_number}</dd></div></dl>
          </div>
        </section>
      </section>
      <section className="trace-checkout-details" aria-label="Payment details">
        <div className="trace-checkout-summary"><header><span className="trace-checkout-caption">TOTAL AMOUNT DUE</span><span className="trace-checkout-document-count">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span></header><strong className="trace-checkout-total select-text">{formatPeso(total)}</strong><p>One payment for {documents.length} {documents.length === 1 ? 'document' : 'documents'}</p>
          <ul aria-label="Payment breakdown">{documents.map(item => <li key={item.id}><div><ReviewIcon name="c7124" /><strong className="min-w-0 flex-1 select-text">{item.document_sequence_number || item.document_type}</strong><span className="font-semibold select-text">{formatPeso(item.amount)}</span></div><CheckoutCharges item={item} /></li>)}</ul>
        </div>
        <form id="student-payment-form" onSubmit={onSubmit} className="trace-checkout-proof" aria-busy={busy}>
          <h3 className="trace-checkout-caption">CONFIRM YOUR PAYMENT</h3>
          {method?.requires_reference !== false && <div><label htmlFor="student-payment-reference" className="trace-label">{method?.reference_label || 'Reference Number'}</label><div className="trace-checkout-reference"><ReviewIcon name="f2409" /><input id="student-payment-reference" maxLength={INPUT_LIMITS.shortText} required disabled={busy} value={reference} onChange={event => onReference(event.target.value)} placeholder="Enter the reference number" className="trace-control" /></div><p>Found on your receipt after paying.</p></div>}
          {method?.requires_proof !== false && <div><p className="trace-label mb-2">Upload receipt</p><FileUploadField showLabel={false} compactPreview pickerIcon={<ReviewIcon name="27353" />} label="Payment proof" file={file} onChange={onFile} disabled={busy} accept="image/*" /><p>Attach a screenshot or photo of your receipt.</p></div>}
        </form>
        <p className="trace-student-information"><ReviewIcon name="44c1e" /><span>The Finance Office will verify your payment. Track its status under Active Requests.</span></p>
      </section>
    </div>
  </ModalShell>;
}
