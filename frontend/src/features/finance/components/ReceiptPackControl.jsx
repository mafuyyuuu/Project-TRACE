import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';
import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { receiptError } from '@/services/receiptService';
import useReceiptActions from '@/hooks/useReceiptActions';

export default function ReceiptPackControl({ packState, onChanged, printControl, settingsAction }) {
  const actions = useReceiptActions();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pack = packState?.pack;
  async function preview(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = { start_serial: first.trim(), end_serial: last.trim(), version: packState.version };
      setReview({ ...body, preview: await actions.preview(body) });
    } catch (err) { setError(receiptError(err)); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError('');
    try {
      await actions.activate(review);
      setReview(null); setOpen(false); onChanged();
    } catch (err) { setError(receiptError(err)); onChanged(); }
    finally { setBusy(false); }
  }
  return <>
    <div className="trace-finance-pack-control space-y-2">
      <label className="trace-label block">Official Receipt issuance number</label>
      {pack?.next_serial && <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Next issuance number" value={pack.next_serial} readOnly className="trace-control min-w-0 flex-1 font-mono" />
        {printControl}
      </div>}
      <div className="trace-finance-pack-actions">{settingsAction}      <Button type="button" disabled={!packState} className="trace-button trace-button-secondary" onClick={() => { setOpen(true); setError(''); }}>
        <FinanceIcon name={settingsAction?"b6740":"864f5"} />{!pack ? 'Input Issuance Number' : !pack.next_serial ? 'Change Issuance Number' : 'Replace paper pack'}
      </Button>
      </div>
      {pack && <progress aria-label="Receipt numbers issued from this pack" max="50" value={pack.consumed} className="trace-finance-pack-progress" />}
      {pack && <p className="text-xs">{pack.consumed} / 50 issued · Last number: <span className="font-mono select-text">{pack.last_serial}</span></p>}
    </div>
    {open && <ModalShell open title={pack ? 'Replace 50-receipt paper pack' : 'Configure 50-receipt paper pack'} subtitle="Enter the range printed on the new pack." headerIcon={<FinanceHeaderIcon name="0ac9d" />} closeButtonIcon={<FinanceIcon name="04f2e" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog max-w-[520px]" busy={busy} onClose={() => !busy && setOpen(false)} closeOnBackdrop={!busy} closeOnEsc={!busy}
      footer={<div className="trace-actions justify-end"><Button type="button" disabled={busy} onClick={()=>setOpen(false)} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form="receipt-pack-form" disabled={busy} className="trace-button trace-button-primary">Review Pack<FinanceIcon name="7d0f5" /></Button></div>}>
      <form id="receipt-pack-form" onSubmit={preview} className="space-y-4">
        <p className="trace-finance-notice"><FinanceIcon name="44c1e" />Enter the complete first and last numbers printed on the pack. The range must contain exactly 50 consecutive receipts. The system identifies which digits increase.</p>
        <label className="trace-label block">First issuance number<input required maxLength={100} value={first} disabled={busy} onChange={event => setFirst(event.target.value)} className="trace-control block w-full" placeholder="2026-00001" /></label>
        <label className="trace-label block">Last issuance number<input required maxLength={100} value={last} disabled={busy} onChange={event => setLast(event.target.value)} className="trace-control block w-full" placeholder="2026-00050" /></label>
        {pack && <progress aria-label="Receipt numbers issued from this pack" max="50" value={pack.consumed} className="trace-finance-pack-progress" />}
      {pack && <p className="trace-finance-warning"><FinanceIcon name="23bd8" />Unused numbers in the old pack remain reserved and cannot be reused.</p>}
        {error && !review && <p role="alert" className="trace-inline-error">{error}</p>}
      </form>
    </ModalShell>}
    <ConfirmDialog open={!!review} title="Activate paper pack?"
      message={review ? [`First three: ${review.preview.first.join(', ')}`, `50th: ${review.preview.last}. This reserves exactly 50 numbers.`, pack ? 'The previous pack will be archived. Unused numbers stay reserved.' : 'No number is consumed until a receipt is issued.'] : []}
      onCancel={() => { setReview(null); setError(''); }} onConfirm={confirm} loading={busy} confirmLabel="Activate Pack">
      {error && <p role="alert" className="trace-inline-error mt-3">{error} If the saved pack changed, cancel this confirmation and review the updated pack.</p>}
    </ConfirmDialog>
  </>;
}
