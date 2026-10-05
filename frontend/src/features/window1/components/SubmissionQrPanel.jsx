import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import useSubmissionQr from '@/hooks/useSubmissionQr';

export default function SubmissionQrPanel() {
  const [applicant, setApplicant] = useState('student');
  const [previewApplicant, setPreviewApplicant] = useState(null);
  const qr = useSubmissionQr(applicant);
  const download = <a href={qr.image} download={`trace-${applicant}-registration-qr.png`} className="trace-button trace-button-secondary">Download QR</a>;
  return <section aria-label="Registration QR" className="trace-section trace-section-body min-w-0 space-y-3">
    <h3 className="text-lg font-bold">TRACE registration QR</h3>
    <p className="text-sm">Scan to open the registration form.</p>
    <label className="trace-label block">Applicant type
      <select value={applicant} onChange={event => { setPreviewApplicant(null); setApplicant(event.target.value); }} className="trace-control mt-2 w-full">
        <option value="student">Current student</option><option value="alumni">Alumni</option>
      </select>
    </label>
    {qr.loading && <p role="status">Generating QR…</p>}
    {qr.error && <p role="alert" className="text-sm">{qr.error}</p>}
    {qr.image && <Button type="button" onClick={() => setPreviewApplicant(applicant)} aria-label={`Preview ${applicant} registration QR`} className="trace-button trace-button-secondary mx-auto flex max-w-full flex-col gap-2 p-2">
      <img src={qr.image} alt={`TRACE ${applicant} registration QR`} className="w-40 max-w-full aspect-square object-contain bg-white" />
      <span className="flex items-center gap-1.5"><svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6m-3-3v6" /></svg>Preview</span>
    </Button>}
    <div className="trace-actions">
      <a href={qr.url} target="_blank" rel="noopener noreferrer" className="trace-button trace-button-secondary">Open registration form</a>
      {qr.image && download}
    </div>
    <details className="text-xs"><summary className="trace-action cursor-pointer">Registration guidance</summary><div className="mt-2 space-y-2">
      <p>Alumni continue to the graduate application on first login. Existing accounts can use Back to Login. This QR is separate from the payment slip’s tracking QR.</p>
      <p>Download from the production site when posting a permanent QR. A preview deployment QR points to that preview.</p>
      <p className="select-text break-all">{qr.url}</p>
    </div></details>
    <ModalShell open={previewApplicant === applicant && !!qr.image} onClose={() => setPreviewApplicant(null)} title="Registration QR Preview" maxWidth="max-w-2xl" footer={<div className="trace-actions justify-end">{download}</div>}>
      <p className="mb-3 text-sm">Scan to register as {applicant === 'alumni' ? 'an alumnus' : 'a current student'}.</p>
      <img src={qr.image} alt={`Expanded TRACE ${applicant} registration QR`} className="mx-auto w-full max-w-lg aspect-square object-contain bg-white" />
      <a href={qr.url} target="_blank" rel="noopener noreferrer" className="mt-3 block select-text break-all text-sm text-green-700 underline dark:text-green-300">{qr.url}</a>
    </ModalShell>
  </section>;
}
