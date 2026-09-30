import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';

export default function AccountVerificationModal({
  studentVerifyToConfirm,
  cancelAdminVerifyStudent,
  confirmAdminVerifyStudent,
  actionLoading,
  setViewImageUrl
}) {
  const [decision, setDecision] = useState(null);
  if (!studentVerifyToConfirm) return null;
  const { student } = studentVerifyToConfirm;

  return (
    <ModalShell
      open={!!studentVerifyToConfirm}
      onClose={cancelAdminVerifyStudent}
      bare
      title="Review Registration"
      panelClassName="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] z-10 border border-gray-100 dark:border-gray-700 relative animate-slide-up flex flex-col lg:flex-row overflow-hidden"
      closeButtonClassName="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 z-20"
    >
      <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 dark:border-gray-700 min-h-0 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-gray-800 dark:text-gray-100">ID Proof</span>
        </div>
        <div className="flex-1 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
          {student.id_proof_path ? (
            <AuthedFilePreview
              path={student.id_proof_path}
              alt="ID Proof"
              iframeTitle="ID Proof"
              className="w-full h-full object-contain hover:scale-105 transition-transform"
              onClick={() => setViewImageUrl(student.id_proof_path)}
              wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center group relative"
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-400 px-6 text-center">
              No ID proof uploaded.
            </span>
          )}
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
            Review Registration
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
            Check the identity proof and account details, then choose a decision.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Applicant</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">{student.full_name}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>ID Number</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{student.student_id}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Course/Program</span><span className="font-bold text-gray-950 dark:text-gray-100">{student.course || '—'}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Email</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{student.email || '—'}</span></div>
          </div>
        </div>

        <div className="shrink-0 px-6 sm:px-8 py-6 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <button
            onClick={cancelAdminVerifyStudent}
            className="w-1/3 py-3 rounded-xl font-bold text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors uppercase tracking-wider text-center"
          >
            Cancel
          </button>
          <button onClick={() => setDecision('reject')} disabled={actionLoading} className="flex-1 py-3 rounded-xl border border-red-300 text-red-700 dark:text-red-300 text-xs font-bold">Reject</button>
          <button onClick={() => setDecision('verify')} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-[#15803d] text-white text-xs font-bold">Verify</button>
        </div>
      </div>
      <ConfirmDialog open={!!decision} title={decision === 'verify' ? 'Verify Account' : 'Reject Account'}
        message={`${decision === 'verify' ? 'Verify' : 'Reject'} ${student.full_name}'s registration?`}
        variant={decision === 'reject' ? 'destructive' : 'neutral'} confirmLabel={decision === 'verify' ? 'Verify Account' : 'Reject Account'}
        loading={actionLoading} onCancel={() => setDecision(null)} onConfirm={() => confirmAdminVerifyStudent(decision)} />
    </ModalShell>
  );
}
