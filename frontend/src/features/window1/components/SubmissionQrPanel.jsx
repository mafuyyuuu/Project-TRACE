import WindowIcon from './WindowIcon';
import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import useSubmissionQr from '@/hooks/useSubmissionQr';

export default function SubmissionQrPanel() {
  const [applicant, setApplicant] = useState('student');
  const [previewApplicant, setPreviewApplicant] = useState(null);
  const qr = useSubmissionQr(applicant);
  const download = <a href={qr.image} download={`trace-${applicant}-registration-qr.png`} className="trace-button trace-button-secondary"><WindowIcon name="download"/>Download QR</a>;
  return <section aria-label="Registration QR" className="trace-section trace-section-body trace-window-qr min-w-0 space-y-3">
    <h3 className="trace-section-title">Registration QR</h3>
    <p className="text-sm">Scan to open the registration form.</p>
    <div className="trace-window-qr-content">
    <div>{qr.loading && <p role="status">Generating QR…</p>}{qr.error && <p role="alert">{qr.error}</p>}{qr.image && <Button type="button" onClick={() => setPreviewApplicant(applicant)} aria-label={`Preview ${applicant} registration QR`} className="trace-action trace-window-qr-image"><img src={qr.image} alt={`TRACE ${applicant} registration QR`} className="w-[100px] h-[100px] object-contain bg-white"/></Button>}</div>
    <label className="trace-label block">Applicant type<select aria-label="Applicant type" value={applicant} onChange={event => {setPreviewApplicant(null);setApplicant(event.target.value);}} className="trace-control mt-2 w-full"><option value="student">Current student</option><option value="alumni">Alumni</option></select><span className="trace-admin-caption block">Scan to register or open the form below.</span></label>
    </div>
    <div className="trace-actions">
      <a href={qr.url} target="_blank" rel="noopener noreferrer" className="trace-button trace-button-secondary"><WindowIcon name="external"/><span aria-label="Open registration form">Open form</span></a>
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
