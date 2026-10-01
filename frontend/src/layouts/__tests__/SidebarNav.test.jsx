import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SidebarNav from '@/layouts/SidebarNav';
import { navItemsForUser } from '@/utils/navigation';

const STUDENT = { id: 3, role: 'student' };
const SECRETARY = { id: 4, role: 'clerk', desk_assignment: 'Secretary' };
const WINDOW1 = { id: 5, role: 'clerk', desk_assignment: 'Window 1' };
const RECEIVING = { id: 6, role: 'clerk', desk_assignment: 'Receiving Desk' };
const FINANCE = { id: 7, role: 'clerk', desk_assignment: 'Finance' };
const ADMIN = { id: 8, role: 'admin' };
const ALUMNI = { id: 9, role: 'student', user_type: 'alumni' };

const renderNav = (props) =>
  render(
    <MemoryRouter>
      <SidebarNav tab="dashboard" onOpenSettings={vi.fn()} onLogout={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe('navItemsForUser', () => {
  it('gives each admin destination a distinct icon', () => {
    const icons = navItemsForUser(ADMIN).map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
  it.each([
    ['student', STUDENT, ['dashboard', 'history', 'messages', 'help']],
    ['alumnus', ALUMNI, ['dashboard', 'history', 'messages', 'graduate-application', 'help']],
    ['secretary', SECRETARY, ['dashboard', 'completed-logs', 'messages', 'grad-applications', 'reports', 'help']],
    ['window 1', WINDOW1, ['dashboard', 'tracking-desk', 'messages', 'reports', 'help']],
    ['finance', FINANCE, ['dashboard', 'reports', 'help']],
  ])('gives a %s their own tabs', (_label, user, expected) => {
    expect(navItemsForUser(user).map((i) => i.tab)).toEqual(expected);
  });

  // 'Receiving Desk' is the legacy name for the same desk and must route alike.
  it('treats the Receiving Desk as Window 1', () => {
    expect(navItemsForUser(RECEIVING).map((i) => i.tab)).toEqual(navItemsForUser(WINDOW1).map((i) => i.tab));
  });

  it('gives the admin every governance tab', () => {
    expect(navItemsForUser(ADMIN).map((i) => i.tab)).toEqual([
      'dashboard',
      'admin-tracker',
      'messages',
      'admin-logs',
      'admin-security',
      'admin-reports',
      'admin-analytics',
      'admin-grad-applications',
      'admin-templates',
      'admin-maintenance',
      'help',
    ]);
  });

  it('returns nothing for a signed-out visitor', () => {
    expect(navItemsForUser(null)).toEqual([]);
  });
});

describe('SidebarNav', () => {
  it('labels every destination in drawer mode', () => {
    renderNav({ user: ALUMNI, showLabels: true });
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Help / FAQ')).toBeInTheDocument();
    expect(screen.getByText('Graduate Application')).toBeInTheDocument();
  });

  // A regular (non-alumni) student must not see the tab at all, not even to
  // navigate to it directly.
  it('hides Graduate Application from a regular student', () => {
    renderNav({ user: STUDENT, showLabels: true });
    expect(screen.queryByText('Graduate Application')).not.toBeInTheDocument();
  });

  // The desktop rail is icon-only; the labels live in the title attribute.
  it('stays icon-only in rail mode', () => {
    renderNav({ user: STUDENT });
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.getByTitle('History')).toBeInTheDocument();
  });

  it('closes the drawer when a destination is chosen', () => {
    const onNavigate = vi.fn();
    renderNav({ user: STUDENT, showLabels: true, onNavigate });
    fireEvent.click(screen.getByText('Help / FAQ'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('opens settings and closes the drawer together', () => {
    const onOpenSettings = vi.fn();
    const onNavigate = vi.fn();
    renderNav({ user: STUDENT, showLabels: true, onOpenSettings, onNavigate });
    fireEvent.click(screen.getByText('Preferences'));
    expect(onOpenSettings).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalled();
  });

  it('logs out from the drawer', () => {
    const onLogout = vi.fn();
    renderNav({ user: ADMIN, showLabels: true, onLogout });
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
  });

  it('marks the active tab', () => {
    renderNav({ user: ADMIN, tab: 'admin-reports', showLabels: true });
    expect(screen.getByText('Reports & Export').closest('a').className).toContain('bg-[#15803d]');
    expect(screen.getByText('System Maintenance').closest('a').className).not.toContain('bg-[#15803d]');
  });
});
