import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';

export default function AccountVerificationModal({
  studentVerifyToConfirm,
  cancelAdminVerifyStudent,
  confirmAdminVerifyStudent,
  actionLoading,
  setViewImageUrl
}) {
  if (!studentVerifyToConfirm) return null;
  const { student, action } = studentVerifyToConfirm;

  return (
    <ModalShell
      open={!!studentVerifyToConfirm}
      onClose={cancelAdminVerifyStudent}
      bare
      title={action === 'verify' ? 'Verify Student' : 'Reject Registration'}
      panelClassName="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] z-10 border border-gray-100 relative animate-slide-up flex flex-col lg:flex-row overflow-hidden"
      closeButtonClassName="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 z-20"
    >
      <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 min-h-0 bg-gray-50/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-gray-800">ID Proof</span>
        </div>
        <div className="flex-1 bg-gray-200 border border-gray-300 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
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
            <span className="text-xs text-gray-400 px-6 text-center">
              No ID proof uploaded.
            </span>
          )}
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <h3 className="text-xl font-black text-gray-900">
            {action === 'verify' ? 'Verify Registration' : 'Reject Registration'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
            {action === 'verify' 
              ? `Confirm the ID matches the student details below to activate the account.`
              : `Reject this registration due to an invalid or mismatched ID proof.`}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 space-y-2">
            <div className="flex justify-between"><span>Applicant</span><span className="font-bold text-gray-950 select-text">{student.full_name}</span></div>
            <div className="flex justify-between"><span>ID Number</span><span className="font-bold text-gray-950">{student.student_id}</span></div>
            <div className="flex justify-between"><span>Course/Program</span><span className="font-bold text-gray-950">{student.course || '—'}</span></div>
            <div className="flex justify-between"><span>Email</span><span className="font-bold text-gray-950">{student.email || '—'}</span></div>
          </div>
        </div>

        <div className="shrink-0 px-6 sm:px-8 py-6 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={cancelAdminVerifyStudent}
            className="w-1/3 py-3 rounded-xl font-bold text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-wider text-center"
          >
            Cancel
          </button>
          <button
            onClick={confirmAdminVerifyStudent}
            disabled={actionLoading}
            className={`w-2/3 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider text-white disabled:opacity-50 ${
              action === 'verify' ? 'bg-[#15803d] hover:bg-[#166534]' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {action === 'verify' ? 'Verify Account' : 'Reject Account'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
