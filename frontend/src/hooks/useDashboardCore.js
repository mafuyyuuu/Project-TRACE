import useDataRefresh from '@/hooks/useDataRefresh';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const actionPending = useRef(false);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current += 1; }, []);
  const [documents, setDocuments] = useState([]);
  const [documentTotal,setDocumentTotal]=useState(null);
  const [dashStats, setDashStats] = useState({
    processed_today: 0,
    cleared_by_secretary_today: 0,
    avg_processing_minutes: 0,
    avg_ocr_confidence: null,
    ocr_field_detection: null,
    backlog_count: 0,
    pending_secretary_count: 0,
    ready_window_1_count: 0,
  });

  const [statsAvailable,setStatsAvailable]=useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeModal, setActiveModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  /** Feedback stays visible until the user acknowledges it. */
  const triggerNotification = useCallback((msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setError('');
    } else {
      setError(msg);
      setSuccess('');
    }
  }, []);

  const dismissNotification = useCallback(() => {
    setSuccess('');
    setError('');
  }, []);

  /**
   * Loads the queue and KPI stats. Stats are best-effort: a stats outage should
   * never blank the document list the desk is working from.
   *
   * Roles needing more (admin forecasts, pending registrations) fetch it in
   * their own hook rather than making every role pay for it.
   */
  const fetchCoreData = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      // The first statement is the await on purpose: nothing may set state
      // before it, or the initial-load effect below would trigger a
      // synchronous cascading render.
      const docsData = await getDocuments(1, 100);
      if (version !== requestVersion.current) return;
      setError('');
      setDocuments(docsData.documents || []);
      setDocumentTotal(Number.isSafeInteger(Number(docsData.total)) && Number(docsData.total)>=0 ? Number(docsData.total) : (docsData.documents || []).length);
      setSelectedDoc(current => current ? { ...current, ...(docsData.documents || []).find(item => item.id === current.id) } : current);

      try {
        const stats = await getDashboardStats();
        if (version === requestVersion.current) {setDashStats(stats);setStatsAvailable(true);}
      } catch {
        if (version === requestVersion.current) setStatsAvailable(false);
        console.warn('Stats unavailable');
      }
    } catch (err) {
      console.error(err);
      if (version === requestVersion.current) setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useDataRefresh(['documents', 'accounts', 'reference'], fetchCoreData, Boolean(user));

  /**
   * Refetch triggered by a user action, where showing the spinner again is
   * correct. The initial load skips this because `loading` already starts true.
   */
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    await fetchCoreData();
  }, [fetchCoreData]);

  useEffect(() => {
    // The fetch is async: every setState inside runs after an await, on a
    // later tick, so no cascading render actually occurs. The rule cannot
    // see through the function boundary to verify that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchCoreData();
  }, [user, fetchCoreData]);

  /**
   * Wraps an async action with the shared loading flag, success feedback, and
   * error handling, then refreshes the queue. Every desk action goes through
   * this so the behaviour stays identical across roles.
   *
   * @returns {Promise<boolean>} whether the action succeeded
   */
  const runAction = useCallback(
    async (fn, { successMessage, errorMessage = 'Action failed.', reload = true } = {}) => {
      if (actionPending.current) return false;
      actionPending.current = true;
      try {
        setActionLoading(true);
        const result = await fn();
        if (successMessage) {
          triggerNotification(typeof successMessage === 'function' ? successMessage(result) : successMessage);
        }
        if (reload) void fetchCoreData();
        return true;
      } catch (err) {
        triggerNotification(err.response?.data?.error || errorMessage, 'error');
        return false;
      } finally {
        actionPending.current = false;
        setActionLoading(false);
      }
    },
    [triggerNotification, fetchCoreData]
  );

  return {
    documents, documentTotal,
    dashStats, statsAvailable,
    loading,
    actionLoading,
    error,
    success,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    triggerNotification,
    dismissNotification,
    loadDashboardData,
    runAction,
    setActionLoading,
  };
}
