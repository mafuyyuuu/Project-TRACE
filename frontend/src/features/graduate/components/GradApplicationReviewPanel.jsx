import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import QueueTabs from '@/components/QueueTabs';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import useGradApplicationReview from '@/features/graduate/useGradApplicationReview';

function ApplicationsTable({ applications, onReview, emptyMessage }) {
  if (applications.length === 0) {
    return <div className="text-center py-12 text-gray-400 font-medium">{emptyMessage}</div>;
  }
  return (
    <table className="w-full text-left border-collapse">
      <thead className="sticky top-0 bg-white z-10">
        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
          <th className="pb-4 font-bold pl-4">Applicant</th>
          <th className="pb-4 font-bold">Course</th>
          <th className="pb-4 font-bold">Submitted</th>
          <th className="pb-4 font-bold">Status</th>
          <th className="pb-4 font-bold text-right pr-4">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {applications.map((a) => (
          <tr key={a.id} className="hover:bg-gray-50/30 group">
            <td className="py-4 pl-4">
              <div className="font-bold text-gray-900">{a.full_name || 'Unknown'}</div>
              <div className="text-xs font-mono text-gray-400 mt-0.5">{a.student_id}</div>
            </td>
            <td className="py-4 text-xs font-bold text-gray-600">{a.course || '—'}</td>
            <td className="py-4 text-xs text-gray-400">{new Date(a.submitted_at).toLocaleDateString()}</td>
            <td className="py-4">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  a.status === 'approved'
                    ? 'bg-emerald-50 text-[#15803d]'
                    : a.status === 'rejected'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {a.status.replace('_', ' ')}
              </span>
            </td>
            <td className="py-4 text-right pr-4">
              <button
                onClick={() => onReview(a)}
                className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all ml-auto block"
              >
                Review
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Staff review panel for submitted Graduate Applications. Built once, dropped
 * into both the Admin and Secretary dashboards — same shape as `UserGrid` /
 * `UserDetailModal` being consumed by both `AdminDashboard` and
 * `MaintenancePanel`.
 */
export default function GradApplicationReviewPanel({ user, currentTab }) {
  const {
    loading,
    error,
    success,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    activeQueueTab,
    setActiveQueueTab,
    selectedApplication,
    selectedAnswers,
    loadingDetail,
    openReview,
    closeReview,
    notes,
    setNotes,
    stageReview,
    reviewToConfirm,
    confirmReview,
    cancelReview,
    actionLoading,
  } = useGradApplicationReview(user, currentTab);

  if (loading) return <DashboardLoading />;

  const queues = {
    pending: pendingApplications,
    approved: approvedApplications,
    rejected: rejectedApplications,
  };
  const emptyMessages = {
    pending: 'Nothing waiting for review.',
    approved: 'No approved applications yet.',
    rejected: 'No rejected applications.',
  };
  const isDecided = selectedApplication?.status === 'approved' || selectedApplication?.status === 'rejected';

  return (
    <div className="space-y-8 animate-fade-in">
      <DashboardAlerts success={success} error={error} />
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
          Graduate <span className="text-[#15803d]">Applications</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1 font-semibold">
          Review submissions from alumni requesting their Graduate Application.
        </p>
      </div>

      <QueueTabs
        tabs={[
          { key: 'pending', label: 'Pending', count: pendingApplications.length },
          { key: 'approved', label: 'Approved', count: approvedApplications.length },
          { key: 'rejected', label: 'Rejected', count: rejectedApplications.length },
        ]}
        activeKey={activeQueueTab}
        onChange={setActiveQueueTab}
      />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="p-4 sm:p-6">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <ApplicationsTable
              applications={queues[activeQueueTab]}
              onReview={openReview}
              emptyMessage={emptyMessages[activeQueueTab]}
            />
          </div>
        </div>
      </div>

      <ModalShell
        open={!!selectedApplication}
        onClose={closeReview}
        title="Graduate Application"
        maxWidth="max-w-xl"
        footer={
          !isDecided ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => stageReview('rejected')}
                disabled={actionLoading || !notes.trim()}
                className="w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => stageReview('approved')}
                disabled={actionLoading}
                className="w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider bg-[#15803d] hover:bg-[#166534] text-white disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          ) : null
        }
      >
        {selectedApplication && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Name</span>
                <span className="font-bold text-gray-950">{selectedApplication.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Student ID</span>
                <span className="font-bold text-gray-950">{selectedApplication.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Email</span>
                <span className="font-bold text-gray-950">{selectedApplication.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Submitted</span>
                <span className="font-bold text-gray-950">
                  {new Date(selectedApplication.submitted_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {loadingDetail ? (
              <div className="text-center py-8 text-gray-400 text-xs font-semibold">Loading answers…</div>
            ) : (
              <div className="space-y-4">
                {selectedAnswers.map((a) => (
                  <div key={a.field_key} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">{a.label}</span>
                    <span className="text-sm text-gray-700">{a.value || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-6">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
                Notes <span className="text-gray-400 normal-case font-semibold">· required to reject</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={isDecided}
                placeholder="Add notes (required for rejection)..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white outline-none transition-all resize-none disabled:opacity-60"
              />
            </div>
          </>
        )}
      </ModalShell>

      <ConfirmDialog
        open={!!reviewToConfirm}
        title={reviewToConfirm?.status === 'approved' ? 'Approve Application' : 'Reject Application'}
        message={
          selectedApplication
            ? reviewToConfirm?.status === 'approved'
              ? `Approve ${selectedApplication.full_name || 'this applicant'}'s Graduate Application?`
              : `Reject ${selectedApplication.full_name || 'this applicant'}'s Graduate Application?`
            : ''
        }
        variant={reviewToConfirm?.status === 'approved' ? 'neutral' : 'destructive'}
        confirmLabel={reviewToConfirm?.status === 'approved' ? 'Approve' : 'Reject'}
        loadingLabel="Saving…"
        loading={actionLoading}
        onConfirm={confirmReview}
        onCancel={cancelReview}
      />
    </div>
  );
}
