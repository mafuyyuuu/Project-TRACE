/** Role-aware dashboard navigation, shared by the desktop rail and the mobile drawer. */

/**
 * The tabs each role can reach. `tab` is matched against the `?tab=` query,
 * with 'dashboard' as the default when none is present.
 */
export function navItemsForUser(user) {
  const isWindow1 =
    user?.role === 'clerk' &&
    (user?.desk_assignment === 'Window 1' || user?.desk_assignment === 'Receiving Desk');

  if (user?.role === 'student') {
    const items = [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'request-history', to: '/dashboard?tab=request-history', label: 'Request History', icon: 'document' },
      { tab: 'payment-history', to: '/dashboard?tab=payment-history', label: 'Payment History', icon: 'card' },
    ];
    // Only an alumnus can file the Graduate Application — a regular student
    // never sees the tab at all, not even to navigate to it directly.
    if (user?.user_type === 'alumni') {
      items.push({ tab: 'graduate-application', to: '/dashboard?tab=graduate-application', label: 'Graduate Application', icon: 'cap' });
    }
    return items;
  }

  if (user?.role === 'clerk' && user?.desk_assignment === 'Secretary') {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'completed-logs', to: '/dashboard?tab=completed-logs', label: 'Completed Logs', icon: 'checklist' },
      { tab: 'grad-applications', to: '/dashboard?tab=grad-applications', label: 'Graduate Applications', icon: 'cap' },
    ];
  }

  if (isWindow1) {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Workspace Dashboard', icon: 'dashboard' },
      { tab: 'tracking-desk', to: '/dashboard?tab=tracking-desk', label: 'Tracking Desk', icon: 'users' },
    ];
  }

  if (user?.role === 'admin') {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'admin-tracker', to: '/dashboard?tab=admin-tracker', label: 'Document Tracker', icon: 'document' },
      { tab: 'admin-users', to: '/dashboard?tab=admin-users', label: 'Registered Users', icon: 'users' },
      { tab: 'admin-logs', to: '/dashboard?tab=admin-logs', label: 'Activity Logs', icon: 'checklist' },
      { tab: 'admin-reports', to: '/dashboard?tab=admin-reports', label: 'Reports & Export', icon: 'report' },
      { tab: 'admin-analytics', to: '/dashboard?tab=admin-analytics', label: 'Efficiency Analytics', icon: 'bolt' },
      { tab: 'admin-grad-applications', to: '/dashboard?tab=admin-grad-applications', label: 'Graduate Applications', icon: 'cap' },
      { tab: 'admin-maintenance', to: '/dashboard?tab=admin-maintenance', label: 'System Maintenance', icon: 'wrench' },
    ];
  }

  // Finance clerk, and any other desk, gets the dashboard alone.
  if (user?.role === 'clerk') {
    return [{ tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }];
  }

  return [];
}
