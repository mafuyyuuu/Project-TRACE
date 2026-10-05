/** Role-aware dashboard navigation, shared by the desktop rail and the mobile drawer. */

/**
 * The tabs each role can reach. `tab` is matched against the `?tab=` query,
 * with 'dashboard' as the default when none is present.
 */
function roleNavItems(user) {
  const isWindow1 =
    user?.role === 'clerk' &&
    (user?.desk_assignment === 'Window 1' || user?.desk_assignment === 'Receiving Desk');

  if (user?.role === 'student') {
    const items = [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'history', to: '/dashboard?tab=history', label: 'History', icon: 'document' },
      { tab: 'messages', to: '/dashboard?tab=messages', label: 'Messages & Attachments', icon: 'message' },
    ];
    // Only an alumnus can file the Graduate Application — a regular student
    // never sees the tab at all, not even to navigate to it directly.
    if (user?.user_type === 'alumni') {
      items.push({ tab: 'graduate-application', to: '/dashboard?tab=graduate-application', label: 'Graduate Application', icon: 'cap', group: 'more' });
    }
    return items;
  }

  if (user?.role === 'clerk' && user?.desk_assignment === 'Secretary') {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'reports', to: '/dashboard?tab=reports', label: 'Records & Export', icon: 'report' },
      { tab: 'messages', to: '/dashboard?tab=messages', label: 'Messages & Attachments', icon: 'message' },
      { tab: 'grad-applications', to: '/dashboard?tab=grad-applications', label: 'Graduate Applications', icon: 'cap', group: 'more' },
    ];
  }

  if (isWindow1) {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Workspace Dashboard', icon: 'dashboard' },
      { tab: 'tracking-desk', to: '/dashboard?tab=tracking-desk', label: 'Tracking Desk', icon: 'users' },
      { tab: 'messages', to: '/dashboard?tab=messages', label: 'Messages & Attachments', icon: 'message' },
      { tab: 'reports', to: '/dashboard?tab=reports', label: 'Reports & Export', icon: 'report', group: 'more' },
    ];
  }

  if (user?.role === 'admin') {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'admin-tracker', to: '/dashboard?tab=admin-tracker', label: 'Document Tracker', icon: 'document' },
      { tab: 'messages', to: '/dashboard?tab=messages', label: 'Messages & Attachments', icon: 'message' },
      { tab: 'admin-logs', to: '/dashboard?tab=admin-logs', label: 'Activity Logs', icon: 'checklist', group: 'more' },
      { tab: 'admin-security', to: '/dashboard?tab=admin-security', label: 'Security Logs', icon: 'shield', group: 'more' },
      { tab: 'admin-reports', to: '/dashboard?tab=admin-reports', label: 'Reports & Export', icon: 'report', group: 'more' },
      { tab: 'admin-analytics', to: '/dashboard?tab=admin-analytics', label: 'Efficiency Analytics', icon: 'bolt', group: 'more' },
      { tab: 'admin-grad-applications', to: '/dashboard?tab=admin-grad-applications', label: 'Graduate Applications', icon: 'cap', group: 'more' },
      { tab: 'admin-templates', to: '/dashboard?tab=admin-templates', label: 'Templates', icon: 'template', group: 'more' },
      { tab: 'admin-maintenance', to: '/dashboard?tab=admin-maintenance', label: 'System Maintenance', icon: 'wrench' },
    ];
  }

  if (user?.role === 'clerk' && user?.desk_assignment === 'Finance') {
    return [
      { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { tab: 'reports', to: '/dashboard?tab=reports', label: 'Transactions & Export', icon: 'report' },
    ];
  }
  // Other desks get the dashboard alone.
  if (user?.role === 'clerk') {
    return [{ tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }];
  }

  return [];
}

export function navItemsForUser(user) {
  const items = roleNavItems(user);
  return user?.role ? [...items, { tab: 'help', to: '/dashboard?tab=help', label: 'Help / FAQ', icon: 'book', group: 'more' }] : items;
}

export function navGroupsForUser(user) {
  const items = navItemsForUser(user);
  // Keep daily-work destinations first, then fill the five visible slots.
  // More is the sixth control only when there are destinations left over.
  const ordered = [...items.filter(item => item.group !== 'more'), ...items.filter(item => item.group === 'more')];
  return {
    main: ordered.slice(0, 5),
    more: ordered.slice(5),
  };
}

/** Keep the old Secretary deep link active within the combined workspace. */
export function canonicalTabForUser(user, tab) {
  return user?.role === 'clerk' && user.desk_assignment === 'Secretary' && tab === 'completed-logs' ? 'reports' : tab;
}
