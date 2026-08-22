import { useState, useEffect, useCallback } from 'react';
import { getDocuments, getDashboardStats } from '@/services/documentsService';

/**
 * State every command center needs: the document queue, KPI stats, the
 * loading/feedback flags, and the shared modal selection.
 *
 * Role-specific data and actions live in the per-role hooks under
 * `features/<role>/`, each of which builds on this core.
 *
 * @param {Object} user authenticated user from useAuth()
 */
export default function useDashboardCore(user) {
  const [documents, setDocuments] = useState([]);
  const [dashStats, setDashStats] = useState({
    processed_today: 0,
    cleared_by_secretary_today: 0,
    avg_processing_minutes: 0,
    avg_ocr_confidence: 0,
    backlog_count: 0,
    pending_secretary_count: 0,
    ready_window_1_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeModal, setActiveModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  /** Transient toast. Errors and successes share one channel by design. */
  const triggerNotification = useCallback((msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    }
  }, []);

  /**
   * Loads the queue and KPI stats. Stats are best-effort: a stats outage should
   * never blank the document list the desk is working from.
   *
   * Roles needing more (admin forecasts, pending registrations) fetch it in
   * their own hook rather than making every role pay for it.
   */
  const loadCoreData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const docsData = await getDocuments(1, 100);
      setDocuments(docsData.documents || []);

      try {
        setDashStats(await getDashboardStats());
      } catch {
        console.warn('Stats unavailable');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadCoreData();
  }, [user, loadCoreData]);

  /**
   * Wraps an async action with the shared loading flag, success toast, and
   * error handling, then refreshes the queue. Every desk action goes through
   * this so the behaviour stays identical across roles.
   *
   * @returns {Promise<boolean>} whether the action succeeded
   */
  const runAction = useCallback(
    async (fn, { successMessage, errorMessage = 'Action failed.', reload = true } = {}) => {
      try {
        setActionLoading(true);
        const result = await fn();
        if (successMessage) {
          triggerNotification(typeof successMessage === 'function' ? successMessage(result) : successMessage);
        }
        if (reload) await loadCoreData();
        return true;
      } catch (err) {
        triggerNotification(err.response?.data?.error || errorMessage, 'error');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [triggerNotification, loadCoreData]
  );

  return {
    documents,
    dashStats,
    loading,
    actionLoading,
    error,
    success,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    triggerNotification,
    loadDashboardData: loadCoreData,
    runAction,
    setActionLoading,
  };
}
