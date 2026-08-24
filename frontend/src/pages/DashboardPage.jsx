import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import ImageViewerModal from '@/components/ImageViewerModal';
import StudentDashboard from '@/features/student/StudentDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import AdminDashboard from '@/features/admin/AdminDashboard';

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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [viewImageUrl, setViewImageUrl] = useState(null);

  const isStudent = user?.role === 'student';
  const isFinance = user?.role === 'clerk' && user?.desk_assignment === 'Finance';
  const isWindow1 = user?.role === 'clerk' && user?.desk_assignment === 'Window 1';
  const isSecretary = user?.role === 'clerk' && user?.desk_assignment === 'Secretary';
  const isAdmin = user?.role === 'admin';

  const props = { user, currentTab, setViewImageUrl };

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {isStudent && <StudentDashboard {...props} />}
      {isFinance && <FinanceDashboard {...props} />}
      {isWindow1 && <Window1Dashboard {...props} />}
      {isSecretary && <SecretaryDashboard {...props} />}
      {isAdmin && <AdminDashboard {...props} />}

      {/* GLOBAL IMAGE VIEWER MODAL */}
      <ImageViewerModal viewImageUrl={viewImageUrl} setViewImageUrl={setViewImageUrl} />
    </div>
  );
}
