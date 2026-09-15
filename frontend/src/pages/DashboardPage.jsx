import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import ImageViewerModal from '@/components/ImageViewerModal';
import ForcePasswordChange from '@/components/ForcePasswordChange';
import StudentDashboard from '@/features/student/StudentDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import AdminDashboard from '@/features/admin/AdminDashboard';
import GraduateApplication from '@/features/graduate/GraduateApplication';

/**
 * The single `/dashboard` route: resolves the user's role and renders the
 * matching command center.
 *
 * Each feature owns its own data through its own hook
 * (`features/<role>/use*Dashboard.js`), so this component holds no queue state
 * and passes almost nothing down. The one exception is the image lightbox,
 * which is rendered once here because every role can open it.
 */
export default function DashboardPage() {
  const { user, logout, updateCachedUser } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [viewImageUrl, setViewImageUrl] = useState(null);

  const isStudent = user?.role === 'student';
  const isAlumni = isStudent && user?.user_type === 'alumni';
  const isFinance = user?.role === 'clerk' && user?.desk_assignment === 'Finance';
  const isWindow1 = user?.role === 'clerk' && user?.desk_assignment === 'Window 1';
  const isSecretary = user?.role === 'clerk' && user?.desk_assignment === 'Secretary';
  const isAdmin = user?.role === 'admin';

  const props = { user, currentTab, setViewImageUrl };

  // An account created with an admin-set temporary password cannot use the
  // system until it has its own. This replaces the dashboard rather than
  // overlaying it, so there is nothing to dismiss.
  if (user?.must_change_password) {
    return (
      <ForcePasswordChange
        user={user}
        onChanged={() => updateCachedUser({ must_change_password: false })}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Graduates/alumni fill in the Registrar's application from its own tab.
          A regular student forcing this tab via the URL falls through to their
          normal dashboard instead, same as any other unrecognized tab value. */}
      {isAlumni && currentTab === 'graduate-application' && <GraduateApplication user={user} />}
      {isStudent && !(isAlumni && currentTab === 'graduate-application') && <StudentDashboard {...props} />}
      {isFinance && <FinanceDashboard {...props} />}
      {isWindow1 && <Window1Dashboard {...props} />}
      {isSecretary && <SecretaryDashboard {...props} />}
      {isAdmin && <AdminDashboard {...props} />}

      {/* GLOBAL IMAGE VIEWER MODAL */}
      <ImageViewerModal viewImageUrl={viewImageUrl} setViewImageUrl={setViewImageUrl} />
    </div>
  );
}
