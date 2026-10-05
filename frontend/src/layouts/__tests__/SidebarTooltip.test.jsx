import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SidebarNav from '@/layouts/SidebarNav';

let fine;
const roles = [
  { role: 'student' },
  { role: 'student', user_type: 'alumni' },
  { role: 'clerk', desk_assignment: 'Window 1' },
  { role: 'clerk', desk_assignment: 'Secretary' },
  { role: 'clerk', desk_assignment: 'Finance' },
  { role: 'admin' },
];
beforeEach(() => {
  fine = new EventTarget();
  fine.matches = true;
  vi.stubGlobal('matchMedia', vi.fn(query => query.includes('pointer') ? fine : { matches: false }));
  // jsdom does not reproduce browser input-modality focus-visible heuristics.
  // These focus tests simulate keyboard focus; real pointer/keyboard behavior
  // is checked separately in the isolated browser.
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (selector) {
    return selector === ':focus-visible' ? document.activeElement === this : matches.call(this, selector);
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 20, top: 60, right: 68, bottom: 108, width: 48, height: 48,
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(props = {}) {
  return render(<MemoryRouter><SidebarNav user={{ id: 8, role: 'admin' }} tab="dashboard" onOpenSettings={vi.fn()} onLogout={vi.fn()} {...props} /></MemoryRouter>);
}

describe('Sidebar hover labels', () => {
  it('portals a single full label outside the scroller and preserves the selected link', () => {
    const { container } = mount();
    const selected = screen.getByRole('link', { name: 'Dashboard' });
    const messages = screen.getByRole('link', { name: 'Messages & Attachments' });
    fireEvent.pointerOver(messages, { pointerType: 'mouse' });
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Messages & Attachments');
    expect(container.contains(tooltip)).toBe(false);
    expect(messages).toHaveAttribute('aria-describedby', tooltip.id);
    expect(messages).not.toHaveAttribute('title');
    expect(selected).toHaveAttribute('aria-current', 'page');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Preferences' }), { pointerType: 'mouse' });
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Preferences');
    expect(messages).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the label reachable by pointer, dismisses with Escape and does not reopen while still hovered', () => {
    mount();
    const control = screen.getByRole('button', { name: 'Preferences' });
    fireEvent.pointerOver(control, { pointerType: 'mouse' });
    const tooltip = screen.getByRole('tooltip');
    fireEvent.pointerOut(control, { relatedTarget: tooltip });
    expect(tooltip).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerOver(control.querySelector('svg'), { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerOut(control, { relatedTarget: document.body });
    fireEvent.pointerOver(control, { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Preferences');
    fireEvent.pointerOut(control, { relatedTarget: screen.getByRole('tooltip') });
    fireEvent.pointerLeave(screen.getByRole('tooltip'), { relatedTarget: document.body });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it.each(roles)('shows names for keyboard focus and keeps Escape from activating anything: $role/$desk_assignment', async user => {
    const keyboard = userEvent.setup(), onOpenSettings = vi.fn();
    mount({ user, onOpenSettings });
    const preferences = screen.getByRole('button', { name: 'Preferences' });
    act(() => preferences.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent('Preferences');
    await keyboard.keyboard('{Escape}');
    expect(preferences).toHaveFocus();
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(onOpenSettings).not.toHaveBeenCalled();
    await keyboard.keyboard('{Enter}');
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not require hover labels or a first reveal tap in the labeled drawer', () => {
    const onNavigate = vi.fn();
    mount({ showLabels: true, onNavigate });
    const messages = screen.getByRole('link', { name: 'Messages & Attachments' });
    fireEvent.pointerOver(messages, { pointerType: 'mouse' });
    act(() => messages.focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByText('Messages & Attachments')).toBeInTheDocument();
    fireEvent.click(messages);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('suppresses coarse-pointer hover and removes stale labels on scroll, mode change and unmount', () => {
    const { unmount } = mount();
    const messages = screen.getByRole('link', { name: 'Messages & Attachments' });
    fine.matches = false;
    fireEvent.pointerOver(messages, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fine.matches = true;
    fireEvent.pointerOver(messages, { pointerType: 'mouse' });
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerOver(messages, { pointerType: 'mouse' });
    act(() => { fine.matches = false; fine.dispatchEvent(new Event('change')); });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fine.matches = true;
    fireEvent.pointerOver(messages, { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    unmount();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('repositions focused labels during scroll and keeps Main/More focus and labels synchronized', () => {
    mount();
    const preferences = screen.getByRole('button', { name: 'Preferences' });
    act(() => preferences.focus());
    fireEvent.scroll(window);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Preferences');
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('link', { name: 'Security Logs' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Security Logs');
    fireEvent.click(screen.getByRole('button', { name: 'Back to main' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Dashboard');
  });
});
