import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import QueueTabs from '@/components/QueueTabs';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import useGradApplicationReview from '@/features/graduate/useGradApplicationReview';
import { useState } from 'react';
import StudentProfileModal from '@/components/StudentProfileModal';

function ApplicationsTable({ applications, onReview, onProfile, emptyMessage }) {
  if (applications.length === 0) {
    return <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">{emptyMessage}</div>;
  }
  return (
    <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
          <th className="pb-4 font-bold pl-4">Applicant</th>
          <th className="pb-4 font-bold">Course</th>
          <th className="pb-4 font-bold">Submitted</th>
          <th className="pb-4 font-bold">Status</th>
          <th className="pb-4 font-bold text-right pr-4">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
        {applications.map((a) => (
          <tr key={a.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
            <td className="py-4 pl-4">
              <Button type="button" disabled={!a.student_id} onClick={() => onProfile(a.student_id)}
                className="trace-action font-bold text-blue-700 dark:text-blue-300 hover:underline select-text break-words text-left focus-visible:ring-2 focus-visible:ring-blue-500 disabled:text-gray-500">{a.full_name || 'Unknown'}</Button>
              <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5 select-text break-words">{a.student_id}</div>
            </td>
            <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{a.course || '—'}</td>
            <td className="py-4 text-xs text-gray-400 dark:text-gray-400">{new Date(a.submitted_at).toLocaleDateString()}</td>
            <td className="py-4">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  a.status === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300'
                    : a.status === 'rejected'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                }`}
              >
                {a.status.replace('_', ' ')}
              </span>
            </td>
            <td className="py-4 text-right pr-4">
              <Button
                onClick={() => onReview(a)}
                className="trace-button trace-button-primary ml-auto block"
              >
                Review
              </Button>
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
  const [viewProfileId, setViewProfileId] = useState(null);
  const {
    loading,
    error,
    success,
    dismissNotification,
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
    <div className="trace-page">
      <StudentProfileModal open={!!viewProfileId} studentId={viewProfileId} onClose={() => setViewProfileId(null)} />
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={activeQueueTab} />
      <div>
        <h2 className="trace-page-title">
          Graduate <span className="text-[#15803d] dark:text-green-300">Applications</span>
        </h2>
        <p className="trace-page-description">
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

      <div key={activeQueueTab} className="trace-section trace-motion-context overflow-hidden mt-6">
        <div className="p-4 sm:p-6">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
            <ApplicationsTable
              applications={queues[activeQueueTab]}
              onReview={openReview}
              onProfile={setViewProfileId}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                onClick={() => stageReview('rejected')}
                disabled={actionLoading || !notes.trim()}
                className="trace-button trace-button-danger w-full sm:w-1/2 text-center"
              >
                Reject
              </Button>
              <Button
                onClick={() => stageReview('approved')}
                disabled={actionLoading}
                className="trace-button trace-button-primary w-full sm:w-1/2 text-center"
              >
                Approve
              </Button>
            </div>
          ) : null
        }
      >
        {selectedApplication && (
          <>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Name</span>
                <span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedApplication.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Student ID</span>
                <span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedApplication.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Email</span>
                <span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedApplication.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Submitted</span>
                <span className="font-bold text-gray-950 dark:text-gray-100">
                  {new Date(selectedApplication.submitted_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {loadingDetail ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-400 text-xs font-semibold">Loading answers…</div>
            ) : (
              <div className="space-y-4">
                {selectedAnswers.map((a) => (
                  <div key={a.field_key} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">{a.label}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 select-text break-words">{a.value || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-6">
              <label className="trace-label">
                Notes <span className="text-gray-400 dark:text-gray-400 normal-case font-semibold">· required to reject</span>
              </label>
              <textarea maxLength={INPUT_LIMITS.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={isDecided}
                placeholder="Add notes (required for rejection)..."
                className="trace-control w-full resize-none"
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
