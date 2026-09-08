import { useState, useEffect, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { getForecast, getInsights, getActivityLogs } from '@/services/documentsService';
import { getPendingStudents, verifyStudent, getUsers } from '@/services/authService';

const ITEMS_PER_PAGE = 10;

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
export default function useAdminDashboard(user, currentTab) {
  const core = useDashboardCore(user);
  const { runAction, loadDashboardData } = core;

  const [forecastData, setForecastData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);

  // Table state
  const [adminDocPage, setAdminDocPage] = useState(1);
  const [adminDocFilter, setAdminDocFilter] = useState('All');
  const [forecastFilter, setForecastFilter] = useState('All');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersFilter, setAdminUsersFilter] = useState('');
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
        const q = adminUsersFilter.toLowerCase();
        const matchesSearch =
          u?.full_name?.toLowerCase().includes(q) ||
          u?.student_id?.toLowerCase().includes(q) ||
          u?.email?.toLowerCase().includes(q);
        const matchesRole = adminUsersRoleFilter === 'All' || u.role === adminUsersRoleFilter;
        return matchesSearch && matchesRole;
      }),
    [adminUsers, adminUsersFilter, adminUsersRoleFilter]
  );

  /**
   * Analytics and the verification queue. Each source is independent: an
   * offline AI engine must not stop the pending-registrations list rendering.
   */
  const loadAdminData = useCallback(async () => {
    // Fetched in parallel; each settles independently so one outage cannot
    // blank the other two panels.
    const [forecast, insights, pending] = await Promise.allSettled([
      getForecast(),
      getInsights(),
      getPendingStudents(),
    ]);

    if (forecast.status === 'fulfilled') setForecastData(forecast.value.forecast || []);
    else console.warn('Forecast unavailable');

    if (insights.status === 'fulfilled') setAiInsights(insights.value.insights || []);
    else console.warn('Insights unavailable');

    if (pending.status === 'fulfilled') setPendingStudents(pending.value.pending_students || []);
    else console.warn('Pending students unavailable');
  }, []);

  useEffect(() => {
    // The fetch is async: every setState inside runs after an await, on a
    // later tick, so no cascading render actually occurs. The rule cannot
    // see through the function boundary to verify that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'admin') loadAdminData();
  }, [user, loadAdminData]);

  // Tab-scoped datasets, fetched only when their tab is opened.
  useEffect(() => {
    if (user?.role !== 'admin' || currentTab !== 'admin-users') return;
    getUsers()
      .then((data) => setAdminUsers(data.users || []))
      .catch((err) => console.error('Failed to load users', err));
  }, [user, currentTab]);

  useEffect(() => {
    if (user?.role !== 'admin' || currentTab !== 'admin-logs') return;
    getActivityLogs()
      .then((data) => setAdminLogs(data.logs || []))
      .catch((err) => console.error('Failed to load activity logs', err));
  }, [user, currentTab]);

  /** @param {'verify'|'reject'} action */
  const handleAdminVerifyStudent = useCallback((student, action) => {
    setStudentVerifyToConfirm({ student, action });
  }, []);

  const confirmAdminVerifyStudent = useCallback(async () => {
    if (!studentVerifyToConfirm) return;
    const { student, action } = studentVerifyToConfirm;

    const ok = await runAction(() => verifyStudent(student.id, action), {
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

  return {
    ...core,
    forecastData,
    aiInsights,
    pendingStudents,
    adminDocPage, setAdminDocPage,
    adminDocFilter, setAdminDocFilter,
    forecastFilter, setForecastFilter,
    adminUsers, adminUsersFilter, setAdminUsersFilter,
    adminUsersRoleFilter, setAdminUsersRoleFilter,
    filteredAdminUsers,
    selectedUser, setSelectedUser,
    adminLogs,
    itemsPerPage: ITEMS_PER_PAGE,
    handleAdminVerifyStudent,
    studentVerifyToConfirm,
    confirmAdminVerifyStudent,
    cancelAdminVerifyStudent,
    loadDashboardData,
  };
}
