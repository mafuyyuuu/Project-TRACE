import Button from '@/components/Button';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import RegistrationProof from '@/components/RegistrationProof';
import AdminRegistrationDetails from './AdminRegistrationDetails';
import AdminIcon from './AdminIcon';

export default function AccountVerificationModal({
  studentVerifyToConfirm,
  cancelAdminVerifyStudent,
  confirmAdminVerifyStudent,
  actionLoading,
  setViewImageUrl,
  reviewPosition = 1,
  reviewTotal = 1
}) {
  const [decision, setDecision] = useState(null);
  const [basis, setBasis] = useState('');
  const [error, setError] = useState('');
  if (!studentVerifyToConfirm) return null;
  const { student } = studentVerifyToConfirm;
  const proofUnavailable = student.registration_proof_unavailable === true
    || student.registration_proof_unavailable === 1 || student.registration_proof_unavailable === '1';
  const choose = action => {
    if (proofUnavailable && !basis.trim()) { setError('Record the evidence checked and the basis for your identity decision.'); return; }
    setError(''); setDecision({ action, basis: basis.trim() });
  };

  return (
    <ModalShell
      open={!!studentVerifyToConfirm}
      onClose={cancelAdminVerifyStudent}
      title="Review Registration"
      panelClassName="trace-modal-panel trace-admin-main-dialog trace-admin-registration max-w-[960px]"
      headerIcon={<span className="trace-admin-review-header-icon"><AdminIcon name="review-shield" /></span>}
      headerBadge={<span className="trace-admin-badge trace-admin-badge-amber rounded-full border border-amber-200"><AdminIcon name="review-dot" />Awaiting manual review</span>}
      closeButtonIcon={<AdminIcon name="review-x" />}
      subtitle="Check the available identity evidence and account details, then choose a decision."
      maxWidth="max-w-[960px]"
      bodyClassName="trace-modal-body bg-[#fafbfc] dark:bg-gray-950"
      busy={actionLoading}
      closeOnEsc={!actionLoading}
      closeOnBackdrop={!actionLoading}
      showCloseButton={!actionLoading}
      footer={<div className="flex flex-wrap items-center justify-between gap-3"><p className="trace-admin-caption flex items-center gap-2"><AdminIcon name="review-dot" />Reviewing {reviewPosition} of {reviewTotal} pending {reviewTotal === 1 ? 'request' : 'requests'}</p><div className="trace-actions">
        <Button type="button" disabled={actionLoading} onClick={cancelAdminVerifyStudent} className="trace-button trace-button-secondary flex-1">Cancel</Button>
        <Button type="button" onClick={() => choose('reject')} disabled={actionLoading} className="trace-button trace-admin-button-danger flex-1"><AdminIcon name="review-x1" />Reject</Button>
        <Button type="button" onClick={() => choose('verify')} disabled={actionLoading} className="trace-button trace-button-primary flex-1"><AdminIcon name="review-check1" />Verify</Button>
      </div></div>}
    >
      <div className="trace-admin-review-grid">
        {proofUnavailable ? <section className="trace-section trace-section-body space-y-3">
          <h4 className="trace-section-title">Proof Unavailable · Identity Review</h4>
          <p className="text-sm select-text">{student.registration_proof_reason}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">No uploaded proof. Check alternative identity evidence and record what was checked and the decision basis before approval.</p>
        </section> : <RegistrationProof key={student.id_proof_path} path={student.id_proof_path} label="ID Proof" onPreview={setViewImageUrl} review />}
        <div className="min-w-0">
          <AdminRegistrationDetails student={student} />
          {proofUnavailable && <label className="trace-label mt-4">Identity Review Evidence / Decision Basis
            <textarea className="trace-control mt-2" required maxLength={1000} value={basis} disabled={actionLoading} onChange={event => setBasis(event.target.value)} />
          </label>}
          {error && <p role="alert" className="trace-error mt-3">{error}</p>}
        </div>
      </div>
      <ConfirmDialog open={!!decision} title={decision?.action === 'verify' ? 'Verify Account' : 'Reject Account'}
        message={`${decision?.action === 'verify' ? 'Verify' : 'Reject'} ${student.full_name}'s registration?`}
        variant={decision?.action === 'reject' ? 'destructive' : 'neutral'} confirmLabel={decision?.action === 'verify' ? 'Verify Account' : 'Reject Account'}
        loading={actionLoading} onCancel={() => setDecision(null)} onConfirm={() => proofUnavailable ? confirmAdminVerifyStudent(decision.action, decision.basis) : confirmAdminVerifyStudent(decision.action)} />
    </ModalShell>
  );
}
