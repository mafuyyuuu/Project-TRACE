import { useState, useEffect, useCallback, useMemo } from 'react';
import { getApplications, getApplication, reviewApplication } from '@/services/gradService';

/**
 * Staff review queue for submitted Graduate Applications — shared by the
 * Admin and Secretary dashboards. The alumnus's own submit-and-view-mine flow
 * lives separately in `useGraduateApplication.js`; this is the other side.
 */
export default function useGradApplicationReview(user, currentTab) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeQueueTab, setActiveQueueTab] = useState('pending');

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewToConfirm, setReviewToConfirm] = useState(null);

  const isActive =
    (user?.role === 'admin' || user?.role === 'clerk') &&
    (currentTab === 'admin-grad-applications' || currentTab === 'grad-applications');

  const load = useCallback(async () => {
    try {
      const data = await getApplications();
      setApplications(data.applications || []);
    } catch {
      setError('Could not load graduate applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The fetch is async: every setState inside runs after an await, on a
    // later tick, so no cascading render actually occurs. The rule cannot
    // see through the function boundary to verify that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isActive) load();
  }, [isActive, load]);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'submitted' || a.status === 'under_review'),
    [applications]
  );
  const approvedApplications = useMemo(() => applications.filter((a) => a.status === 'approved'), [applications]);
  const rejectedApplications = useMemo(() => applications.filter((a) => a.status === 'rejected'), [applications]);

  const openReview = useCallback(async (application) => {
    setSelectedApplication(application);
    setSelectedAnswers([]);
    setNotes(application.notes || '');
    setLoadingDetail(true);
    try {
      const data = await getApplication(application.id);
      setSelectedAnswers(data.answers || []);
    } catch {
      setError('Could not load this application.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const closeReview = useCallback(() => {
    setSelectedApplication(null);
    setSelectedAnswers([]);
    setNotes('');
  }, []);

  /**
   * Stage an approve/reject for confirmation. A rejection needs a reason on
   * the record — matching Window 1's return-to-student and Finance's
   * reject-payment, which both require notes for the same reason.
   * @param {'approved'|'rejected'} status
   */
  const stageReview = useCallback(
    (status) => {
      if (!selectedApplication) return;
      if (status === 'rejected' && !notes.trim()) {
        setError('Add a note explaining the rejection.');
        return;
      }
      setError('');
      setReviewToConfirm({ status });
    },
    [selectedApplication, notes]
  );

  const confirmReview = useCallback(async () => {
    if (!selectedApplication || !reviewToConfirm) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await reviewApplication(selectedApplication.id, reviewToConfirm.status, notes.trim() || null);
      setSuccess(res.message || 'Application updated.');
      setReviewToConfirm(null);
      closeReview();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update this application.');
    } finally {
      setActionLoading(false);
    }
  }, [selectedApplication, reviewToConfirm, notes, load, closeReview]);

  const cancelReview = useCallback(() => setReviewToConfirm(null), []);

  return {
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
  };
}
