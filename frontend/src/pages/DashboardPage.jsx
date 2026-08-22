import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import useDashboard from '@/hooks/useDashboard';
import { getUsers } from '@/services/authService';
import { getActivityLogs } from '@/services/documentsService';
import ImageViewerModal from '@/components/ImageViewerModal';
import { apiBaseUrl } from '@/utils/env';
import StudentDashboard from '@/features/student/StudentDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import AdminDashboard from '@/features/admin/AdminDashboard';

/**
 * The single `/dashboard` route. Resolves the logged-in user's role and
 * renders the matching command center from features/ — all data fetching and
 * action handlers come from the useDashboard hook.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Pagination / filter state owned by the clerk + admin tables
  const [w1ReleasePage, setW1ReleasePage] = useState(1);
  const [w1ProgressPage, setW1ProgressPage] = useState(1);
  const [adminDocPage, setAdminDocPage] = useState(1);
  const itemsPerPage = 10;

  const [adminDocFilter, setAdminDocFilter] = useState('All');
  const [forecastFilter, setForecastFilter] = useState('All');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersFilter, setAdminUsersFilter] = useState('');
  const [adminLogs, setAdminLogs] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin' && currentTab === 'admin-users') {
      getUsers()
        .then((data) => setAdminUsers(data.users || []))
        .catch((err) => console.error('Failed to load users', err));
    }
  }, [currentTab, user]);

  useEffect(() => {
    if (user?.role === 'admin' && currentTab === 'admin-logs') {
      getActivityLogs()
        .then((data) => setAdminLogs(data.logs || []))
        .catch((err) => console.error('Failed to load activity logs', err));
    }
  }, [currentTab, user]);

  const dashboard = useDashboard(user);
  const {
    loading, error, success,
    viewImageUrl, setViewImageUrl,
  } = dashboard;

  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Role checks — desk assignment distinguishes the three clerk command centers.
  const isStudent = user?.role === 'student';
  const isFinance = user?.role === 'clerk' && user?.desk_assignment === 'Finance';
  const isWindow1 = user?.role === 'clerk' && user?.desk_assignment === 'Window 1';
  const isSecretary = user?.role === 'clerk' && user?.desk_assignment === 'Secretary';
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-pine-500/20 border-t-pine-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium text-sm">Synchronizing Command Center...</p>
      </div>
    );
  }

  // Everything each command center needs, in one bag.
  const shared = {
    ...dashboard,
    user,
    currentTab,
    todayFormatted,
    itemsPerPage,
    w1ReleasePage, setW1ReleasePage,
    w1ProgressPage, setW1ProgressPage,
    adminDocPage, setAdminDocPage,
    adminDocFilter, setAdminDocFilter,
    forecastFilter, setForecastFilter,
    adminUsers, adminUsersFilter, setAdminUsersFilter,
    adminLogs,
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Dynamic Alerts */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {isStudent && <StudentDashboard {...shared} />}
      {isFinance && <FinanceDashboard {...shared} />}
      {isWindow1 && <Window1Dashboard {...shared} />}
      {isSecretary && <SecretaryDashboard {...shared} />}
      {isAdmin && <AdminDashboard {...shared} />}

      {/* GLOBAL IMAGE VIEWER MODAL */}
      <ImageViewerModal
        viewImageUrl={viewImageUrl}
        setViewImageUrl={setViewImageUrl}
        apiBaseUrl={apiBaseUrl}
      />

    </div>
  );
}
