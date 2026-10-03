import { useState } from 'react';
import useSubmissionQr from '@/hooks/useSubmissionQr';

export default function SubmissionQrPanel() {
  const [applicant, setApplicant] = useState('student');
  const qr = useSubmissionQr(applicant);
  return <section className="trace-section trace-section-body min-w-0 space-y-3">
    <h3 className="text-lg font-bold">TRACE registration QR</h3>
    <p className="text-sm">Share this registration link with counter applicants. Alumni continue to the graduate application on first login. Existing accounts can use Back to Login. This QR is separate from the tracking QR on a payment slip.</p>
    <label className="trace-label block">Applicant type
      <select value={applicant} onChange={event => setApplicant(event.target.value)} className="trace-control mt-2 w-full">
        <option value="student">Current student</option><option value="alumni">Alumni</option>
      </select>
    </label>
    {qr.loading && <p role="status">Generating QR…</p>}
    {qr.error && <p role="alert" className="text-sm">{qr.error}</p>}
    {qr.image && <img src={qr.image} alt={`TRACE ${applicant} registration QR`} className="mx-auto w-48 max-w-full bg-white" />}
    <a href={qr.url} target="_blank" rel="noopener noreferrer" className="block select-text break-all text-sm text-green-700 underline dark:text-green-300">{qr.url}</a>
    {qr.image && <a href={qr.image} download={`trace-${applicant}-registration-qr.png`} className="inline-block rounded-xl border px-4 py-2 text-sm font-bold">Download QR</a>}
    <p className="text-xs">Download from the production site when posting a permanent QR. A preview deployment QR points to that preview.</p>
  </section>;
}
