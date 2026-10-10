import Button from '@/components/Button';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import RegistrationProof from '@/components/RegistrationProof';
import RegistrationReviewNotice from '@/components/RegistrationReviewNotice';

export default function AccountVerificationModal({
  studentVerifyToConfirm,
  cancelAdminVerifyStudent,
  confirmAdminVerifyStudent,
  actionLoading,
  setViewImageUrl
}) {
  const [decision, setDecision] = useState(null);
  const [basis, setBasis] = useState('');
  const [error, setError] = useState('');
  if (!studentVerifyToConfirm) return null;
  const { student } = studentVerifyToConfirm;
  const choose = action => {
    if (student.registration_proof_unavailable && !basis.trim()) { setError('Record the evidence checked and the basis for your identity decision.'); return; }
    setError(''); setDecision({ action, basis: basis.trim() });
  };

  return (
    <ModalShell
      open={!!studentVerifyToConfirm}
      onClose={cancelAdminVerifyStudent}
      title={<span className="text-base sm:text-xl">Review Registration</span>}
      maxWidth="max-w-5xl"
      footer={<div className="trace-actions">
        <Button type="button" onClick={cancelAdminVerifyStudent} className="trace-button trace-button-secondary flex-1">Cancel</Button>
        <Button type="button" onClick={() => choose('reject')} disabled={actionLoading} className="trace-button trace-button-danger flex-1">Reject</Button>
        <Button type="button" onClick={() => choose('verify')} disabled={actionLoading} className="trace-button trace-button-primary flex-1">Verify</Button>
      </div>}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-6">
        {student.registration_proof_unavailable ? <section className="trace-section trace-section-body space-y-3">
          <h4 className="trace-section-title">Proof Unavailable · Defense Demo</h4>
          <p className="text-sm select-text">{student.registration_proof_reason}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">No uploaded proof. Check alternative identity evidence and record the decision basis before approval. Production activation requires the institution's evidence policy.</p>
        </section> : <RegistrationProof path={student.id_proof_path} label="ID Proof" onPreview={setViewImageUrl} />}
        <div className="min-w-0">
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
            Check the identity proof and account details, then choose a decision.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Applicant</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">{student.full_name}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>ID Number</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{student.student_id}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Course/Program</span><span className="font-bold text-gray-950 dark:text-gray-100">{student.program || 'Not entered'}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>College</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">{student.course || 'Not entered'}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Email</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{student.email || '—'}</span></div>
          </div>
          <RegistrationReviewNotice user={student} />
          {student.registration_proof_unavailable && <label className="trace-label mt-4">Identity Review Evidence / Decision Basis
            <textarea className="trace-control mt-2" required maxLength={1000} value={basis} disabled={actionLoading} onChange={event => setBasis(event.target.value)} />
          </label>}
          {error && <p role="alert" className="trace-error mt-3">{error}</p>}
        </div>
      </div>
      <ConfirmDialog open={!!decision} title={decision?.action === 'verify' ? 'Verify Account' : 'Reject Account'}
        message={`${decision?.action === 'verify' ? 'Verify' : 'Reject'} ${student.full_name}'s registration?`}
        variant={decision?.action === 'reject' ? 'destructive' : 'neutral'} confirmLabel={decision?.action === 'verify' ? 'Verify Account' : 'Reject Account'}
        loading={actionLoading} onCancel={() => setDecision(null)} onConfirm={() => student.registration_proof_unavailable ? confirmAdminVerifyStudent(decision.action, decision.basis) : confirmAdminVerifyStudent(decision.action)} />
    </ModalShell>
  );
}
