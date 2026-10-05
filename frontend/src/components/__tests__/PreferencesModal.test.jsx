import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencesModal from '@/components/PreferencesModal';

describe('PreferencesModal', () => {
  it('updates controlled appearance and text size while keeping focus inside, then restores focus on Escape', async () => {
    const user = userEvent.setup();
    function Preferences() {
      const [open, setOpen] = useState(false);
      const [dark, setDark] = useState(false);
      const [size, setSize] = useState(100);
      return <>
        <button onClick={() => setOpen(true)}>Preferences</button>
        {open && <PreferencesModal onClose={() => setOpen(false)} darkMode={dark}
          onToggleTheme={() => setDark(value => !value)} textSize={size} onTextSizeChange={setSize} />}
      </>;
    }
    render(<Preferences />);
    const trigger = screen.getByRole('button', { name: 'Preferences' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Preferences' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();
    const theme = within(dialog).getByRole('button', { name: 'Switch to Dark Mode' });
    expect(theme).toHaveAttribute('aria-pressed', 'false');
    await user.click(theme);
    expect(theme).toHaveAccessibleName('Switch to Light Mode');
    expect(theme).toHaveAttribute('aria-pressed', 'true');
    const size = within(dialog).getByRole('combobox', { name: 'Text size' });
    expect(size).toHaveAccessibleDescription(/Default: 100%/);
    for (const value of ['125', '150', '200', '100']) {
      await user.selectOptions(size, value);
      expect(size).toHaveValue(value);
    }
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(size).toHaveFocus();
    trigger.focus();
    expect(dialog).toContainElement(document.activeElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('disables unavailable preferences without changing or submitting profile data', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PreferencesModal onClose={onClose} darkMode textSize={200} />);
    const theme = screen.getByRole('button', { name: 'Switch to Light Mode' });
    const size = screen.getByRole('combobox', { name: 'Text size' });
    expect(theme).toBeDisabled();
    expect(theme).toHaveAttribute('aria-pressed', 'true');
    expect(size).toBeDisabled();
    await user.click(theme);
    expect(onClose).not.toHaveBeenCalled();
    expect(size).toHaveValue('200');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});
