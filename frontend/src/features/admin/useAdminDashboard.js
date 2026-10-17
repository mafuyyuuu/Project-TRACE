import useDataRefresh from '@/hooks/useDataRefresh';
import useViewportPagination from '@/hooks/useViewportPagination';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { getForecast, getInsights, getActivityLogs } from '@/services/documentsService';
import { getPendingStudents, verifyStudent, getUsers } from '@/services/authService';
import { getAnalytics } from '@/services/reportsService';


/**
 * Registrar admin: ML forecasting, AI queue insights, manual account
 * verification, and the global user/audit tables.
 *
 * The admin-only datasets are fetched here rather than in the shared core, so
 * the four clerk dashboards don't pay for data they never render.
 *
 * @param {Object} user authenticated user
 * @param {string} currentTab active sidebar tab — drives the lazy tab fetches
 */
export default function useAdminDashboard(user, currentTab, reviewAccountId, reviewNavigationKey) {
  const core = useDashboardCore(user);
  const { runAction, loadDashboardData } = core;

  const reviewedNotification = useRef(null);
  const [forecastData, setForecastData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const insightsPending = useRef(false);
  const refreshInsights = useCallback(async () => {
    if (insightsPending.current) return;
    insightsPending.current = true; setInsightsLoading(true);
    try {
      const result = await getInsights();
      if (!Array.isArray(result.insights) || !result.insights.length) throw new Error('No document advice returned.');
      setAiInsights(result.insights);
    } catch {
      setAiInsights([{ type: 'info', title: 'Insights unavailable', message: 'Could not refresh the insight snapshot. No current queue or performance conclusion is inferred. Retry Refresh insights.' }]);
    } finally { insightsPending.current = false; setInsightsLoading(false); }
  }, []);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);

  // Table state
  const [adminDocPage, setAdminDocPage] = useState(1);
  const [adminDocFilter, setAdminDocFilter] = useState('All');
  const [forecastFilter, setForecastFilter] = useState('All');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersRoleFilter, setAdminUsersRoleFilter] = useState('All');
  const [adminLogs, setAdminLogs] = useState([]);

  // The card grid's detail modal — view-only here, this surface has no
  // mutation wiring (that authority lives with MaintenancePanel).
  const [selectedUser, setSelectedUser] = useState(null);

  // The { student, action } staged for a verification confirmation, or null.
  const [studentVerifyToConfirm, setStudentVerifyToConfirm] = useState(null);

  const filteredAdminUsers = useMemo(
    () =>
      adminUsers.filter((u) => {
        const matchesRole = adminUsersRoleFilter === 'All' || u.role === adminUsersRoleFilter;
        return matchesRole;
      }),
    [adminUsers, adminUsersRoleFilter]
  );

  /**
   * Analytics and the verification queue. Each source is independent: an
   * offline AI engine must not stop the pending-registrations list rendering.
   */
  const adminVersion = useRef(0);
  useEffect(() => () => { adminVersion.current += 1; }, []);
  const loadAdminData = useCallback(async () => {
    const version = ++adminVersion.current;
    // Fetched in parallel; each settles independently so one outage cannot
    // blank the other panels.
    await Promise.allSettled([
      getForecast().then(data => { if (version === adminVersion.current) setForecastData(data.forecast || []); }),
      getPendingStudents().then(data => {
      if (version !== adminVersion.current) return;
      const applicants = data.pending_students || [];
      setPendingStudents([...applicants].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || Number(b.id)-Number(a.id)));
      const id = reviewAccountId;
      const reviewKey = `${reviewNavigationKey}:${id}`;
      const applicant = applicants.find(item => String(item.id) === id);
      if (applicant && reviewedNotification.current !== reviewKey) {
        reviewedNotification.current = reviewKey; setStudentVerifyToConfirm({ student: applicant, action: 'review' });
      }
      }),
      getAnalytics().then(data => { if (version === adminVersion.current) setAnalyticsSummary(data); }),
      refreshInsights(),
    ]);
  }, [reviewAccountId, reviewNavigationKey, refreshInsights]);

  useEffect(() => {
    // The fetch is async: every setState inside runs after an await, on a
    // later tick, so no cascading render actually occurs. The rule cannot
    // see through the function boundary to verify that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'admin') loadAdminData();
  }, [user, loadAdminData]);

  useDataRefresh(['accounts', 'documents', 'graduate'], loadAdminData, user?.role === 'admin');

  // Tab-scoped datasets, fetched only when their tab is opened.
  useEffect(() => {
    if (user?.role !== 'admin' || currentTab !== 'admin-users') return;
    let active = true;
    getUsers()
      .then((data) => { if (active) setAdminUsers(data.users || []); })
      .catch((err) => console.error('Failed to load users', err));
    return () => { active = false; };
  }, [user, currentTab]);

  useEffect(() => {
    if (user?.role !== 'admin' || currentTab !== 'admin-logs') return;
    let active = true;
    getActivityLogs()
      .then((data) => { if (active) setAdminLogs(data.logs || []); })
      .catch((err) => console.error('Failed to load activity logs', err));
    return () => { active = false; };
  }, [user, currentTab]);
  useDataRefresh(['accounts'], async () => {
    const data = await getUsers();
    setAdminUsers(data.users || []);
    setSelectedUser(current => current ? (data.users || []).find(item => item.id === current.id) || null : null);
  }, user?.role === 'admin' && currentTab === 'admin-users');
  useDataRefresh(['accounts', 'documents', 'support', 'graduate', 'reference'], async () => {
    const data = await getActivityLogs(); setAdminLogs(data.logs || []);
  }, user?.role === 'admin' && currentTab === 'admin-logs');

  /** @param {'verify'|'reject'} action */
  const handleAdminVerifyStudent = useCallback((student, action) => {
    setStudentVerifyToConfirm({ student, action });
  }, []);

  const confirmAdminVerifyStudent = useCallback(async (decision, evidenceBasis) => {
    if (!studentVerifyToConfirm) return;
    const { student } = studentVerifyToConfirm;
    const action = decision || studentVerifyToConfirm.action;
    if (!['verify', 'reject'].includes(action)) return;

    const ok = await runAction(async () => {
      const result = await verifyStudent(student.id, action, evidenceBasis);
      setPendingStudents(current => current.filter(row => Number(row.id) !== Number(student.id)));
      return result;
    }, {
      successMessage: `Student account registration successfully ${
        action === 'verify' ? 'verified' : 'rejected'
      }.`,
      errorMessage: 'Verification failed.',
    });
    if (ok) {
      setStudentVerifyToConfirm(null);
      // Refresh the queue this action just changed.
      await loadAdminData();
    }
  }, [studentVerifyToConfirm, runAction, loadAdminData]);

  const cancelAdminVerifyStudent = useCallback(() => {
    setStudentVerifyToConfirm(null);
  }, []);

  const pagination = useViewportPagination({ page: adminDocPage, setPage: setAdminDocPage,
    total: core.documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length,
    enabled: currentTab === 'admin-tracker' });

  return {
    ...core,
    forecastData,
    aiInsights, insightsLoading, refreshInsights,
    pendingStudents,
    analyticsSummary,
    adminDocPage: pagination.page, setAdminDocPage,
    adminDocFilter, setAdminDocFilter,
    forecastFilter, setForecastFilter,
    adminUsers,
    adminUsersRoleFilter, setAdminUsersRoleFilter,
    filteredAdminUsers,
    selectedUser, setSelectedUser,
    adminLogs,
    itemsPerPage: pagination.pageSize,
    tableRef: pagination.containerRef,
    handleAdminVerifyStudent,
    studentVerifyToConfirm,
    confirmAdminVerifyStudent,
    cancelAdminVerifyStudent,
    loadDashboardData,
  };
}
