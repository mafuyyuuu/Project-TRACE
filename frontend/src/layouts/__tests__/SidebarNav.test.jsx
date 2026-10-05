import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import SidebarNav from '@/layouts/SidebarNav';
import { canonicalTabForUser, navItemsForUser, navGroupsForUser } from '@/utils/navigation';

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

function RoutedNav() {
  const location = useLocation(), navigate = useNavigate();
  return <>
    <SidebarNav user={ADMIN} tab={new URLSearchParams(location.search).get('tab') || 'dashboard'} />
    <button onClick={() => navigate('/dashboard?tab=admin-templates')}>Direct template link</button>
    <button onClick={() => navigate(-1)}>Browser Back</button>
    <button onClick={() => navigate(1)}>Browser Forward</button>
  </>;
}

describe('navItemsForUser', () => {
  it('gives each admin destination a distinct icon', () => {
    const icons = navItemsForUser(ADMIN).map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
  it.each([
    ['student', STUDENT, ['dashboard', 'history', 'messages', 'help']],
    ['alumnus', ALUMNI, ['dashboard', 'history', 'messages', 'graduate-application', 'help']],
    ['secretary', SECRETARY, ['dashboard', 'reports', 'messages', 'grad-applications', 'help']],
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
  it.each([STUDENT, ALUMNI, SECRETARY, WINDOW1, RECEIVING, FINANCE, ADMIN, { role: 'clerk', desk_assignment: 'Other' }])('partitions every authorized destination exactly once for $role/$desk_assignment', user => {
    const groups = navGroupsForUser(user);
    const tabs = [...groups.main, ...groups.more].map(item => item.tab);
    expect(tabs.sort()).toEqual(navItemsForUser(user).map(item => item.tab).sort());
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(groups.main).toHaveLength(Math.min(5, tabs.length));
    expect(groups.more).toHaveLength(Math.max(0, tabs.length - 5));
  });
  it('keeps daily Finance transactions in Main and admin configuration available', () => {
    expect(navGroupsForUser(FINANCE).main.map(item => item.tab)).toEqual(['dashboard', 'reports', 'help']);
    expect(navGroupsForUser(ADMIN).main.map(item => item.tab)).toContain('admin-maintenance');
  });
});

describe('SidebarNav', () => {
  it.each([STUDENT, ALUMNI, SECRETARY, WINDOW1, RECEIVING, FINANCE])('shows every destination directly without More for $role/$desk_assignment', user => {
    renderNav({ user, showLabels: true });
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getAllByRole('link')).toHaveLength(navItemsForUser(user).length);
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to main' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });
  it('places More sixth after five Admin destinations and exposes all overflow', () => {
    renderNav({ user: ADMIN, showLabels: true });
    const main = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(main).getAllByRole('link')).toHaveLength(5);
    expect([...main.querySelectorAll('a, button')].at(5)).toBe(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    const more = screen.getByRole('navigation', { name: 'More navigation' });
    expect(within(more).getAllByRole('link')).toHaveLength(navItemsForUser(ADMIN).length - 5);
    expect(screen.getByRole('button', { name: 'Back to main' })).toBeInTheDocument();
  });
  it('marks the combined Secretary workspace active for both old and current links', () => {
    expect(canonicalTabForUser(ADMIN, 'completed-logs')).toBe('completed-logs');
    expect(canonicalTabForUser(SECRETARY, 'completed-logs')).toBe('reports');
    renderNav({ user: SECRETARY, tab: 'completed-logs', showLabels: true });
    expect(screen.getByRole('link', { name: 'Records & Export' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Completed Logs' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Records & Export' })).toHaveAttribute('href', '/dashboard?tab=reports');
  });
  it('labels every destination in drawer mode', () => {
    renderNav({ user: ALUMNI, showLabels: true });
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.getByText('Help / FAQ')).toBeInTheDocument();
    expect(screen.getByText('Graduate Application')).toBeInTheDocument();
  });

  // A regular (non-alumni) student must not see the tab at all, not even to
  // navigate to it directly.
  it('hides Graduate Application from a regular student', () => {
    renderNav({ user: STUDENT, showLabels: true });
    expect(screen.queryByText('Graduate Application')).not.toBeInTheDocument();
  });

  // The desktop rail stays icon-only; controls always have accessible names.
  it('stays icon-only in rail mode', () => {
    renderNav({ user: STUDENT });
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes the drawer when a destination is chosen', () => {
    const onNavigate = vi.fn();
    renderNav({ user: STUDENT, showLabels: true, onNavigate });
    expect(onNavigate).not.toHaveBeenCalled();
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
    expect(screen.getByRole('link', { name: 'Reports & Export' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'System Maintenance' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to main' }));
    expect(screen.getByRole('link', { name: 'System Maintenance' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'More' }).className).toContain('bg-[#15803d]');
  });
  it.each([false, true])('keeps Preferences and Logout working in both groups (labels=%s)', showLabels => {
    const onOpenSettings = vi.fn(), onLogout = vi.fn();
    renderNav({ user: ADMIN, showLabels, onOpenSettings, onLogout });
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(2);
    expect(onLogout).toHaveBeenCalledTimes(2);
  });
  it('reveals a new active destination after route/account changes and when a guide targets More', () => {
    const { rerender } = renderNav({ user: ADMIN });
    rerender(<MemoryRouter><SidebarNav user={ADMIN} tab="admin-templates" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
    rerender(<MemoryRouter><SidebarNav user={ADMIN} tab="dashboard" revealTab="admin-security" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Security Logs' })).toHaveAttribute('data-guide-tab', 'admin-security');
    rerender(<MemoryRouter><SidebarNav user={STUDENT} tab="dashboard" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument();
  });
  it('transfers focus after keyboard group switches without navigating', async () => {
    const keyboard = userEvent.setup(), onNavigate = vi.fn();
    renderNav({ user: ADMIN, showLabels: true, onNavigate });
    screen.getByRole('button', { name: 'More' }).focus();
    await keyboard.keyboard('{Enter}');
    expect(screen.getByRole('link', { name: 'Security Logs' })).toHaveFocus();
    screen.getByRole('button', { name: 'Back to main' }).focus();
    await keyboard.keyboard(' ');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus();
    expect(onNavigate).not.toHaveBeenCalled();
  });
  it('follows direct links and browser history, including a repeated direct link after Back to main', async () => {
    const keyboard = userEvent.setup();
    render(<MemoryRouter initialEntries={['/dashboard']}><RoutedNav /></MemoryRouter>);
    await keyboard.click(screen.getByRole('button', { name: 'Direct template link' }));
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
    await keyboard.click(screen.getByRole('button', { name: 'Browser Back' }));
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    await keyboard.click(screen.getByRole('button', { name: 'Browser Forward' }));
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
    await keyboard.click(screen.getByRole('button', { name: 'Back to main' }));
    expect(screen.queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument();
    await keyboard.click(screen.getByRole('button', { name: 'Direct template link' }));
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
  });
});
