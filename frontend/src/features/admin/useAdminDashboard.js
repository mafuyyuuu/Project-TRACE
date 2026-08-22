import { useState, useEffect, useCallback } from 'react';
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
  const [adminLogs, setAdminLogs] = useState([]);

  /**
   * Analytics and the verification queue. Each source is independent: an
   * offline AI engine must not stop the pending-registrations list rendering.
   */
  const loadAdminData = useCallback(async () => {
    try {
      setForecastData((await getForecast()).forecast || []);
    } catch {
      console.warn('Forecast unavailable');
    }
    try {
      setAiInsights((await getInsights()).insights || []);
    } catch {
      console.warn('Insights unavailable');
    }
    try {
      setPendingStudents((await getPendingStudents()).pending_students || []);
    } catch {
      console.warn('Pending students unavailable');
    }
  }, []);

  useEffect(() => {
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
  const handleAdminVerifyStudent = useCallback(
    async (userId, action) => {
      const ok = await runAction(() => verifyStudent(userId, action), {
        successMessage: `Student account registration successfully ${
          action === 'verify' ? 'verified' : 'rejected'
        }.`,
        errorMessage: 'Verification failed.',
      });
      // Refresh the queue this action just changed.
      if (ok) await loadAdminData();
    },
    [runAction, loadAdminData]
  );

  return {
    ...core,
    forecastData,
    aiInsights,
    pendingStudents,
    adminDocPage, setAdminDocPage,
    adminDocFilter, setAdminDocFilter,
    forecastFilter, setForecastFilter,
    adminUsers, adminUsersFilter, setAdminUsersFilter,
    adminLogs,
    itemsPerPage: ITEMS_PER_PAGE,
    handleAdminVerifyStudent,
    loadDashboardData,
  };
}
