import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportDropdown from '@/components/ExportDropdown';

const options = [{ key: 'documents', label: 'Documents (CSV)' }, { key: 'students', label: 'Students (CSV)' }];

describe('ExportDropdown', () => {
  it('supports keyboard selection, dismissal and focus return without exporting on navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExportDropdown options={options} onSelect={onSelect} />);
    await user.tab();
    const trigger = screen.getByRole('button', { name: 'Export' });
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Documents (CSV)' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Students (CSV)' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Documents (CSV)' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{Home}{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('students');
    expect(trigger).toHaveFocus();
  });

  it('dismisses on outside pointer or focus without trapping Tab', async () => {
    const user = userEvent.setup();
    render(<><ExportDropdown options={options} onSelect={vi.fn()} /><button>Outside</button></>);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('keeps pending exports unavailable and removes listeners when unmounted', async () => {
    const onSelect = vi.fn();
    const view = render(<ExportDropdown options={options} exporting onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Exporting…' }));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    view.rerender(<ExportDropdown options={options} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    view.unmount();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});
