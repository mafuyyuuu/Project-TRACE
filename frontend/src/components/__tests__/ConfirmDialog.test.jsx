import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '@/components/ConfirmDialog';

const props = { open: true, title: 'Release Document', message: 'Hand over this document?', confirmLabel: 'Release', cancelLabel: 'Keep Document' };

describe('ConfirmDialog', () => {
  it('renders custom labels and describes the dialog with its message', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...props} onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: props.title })).toHaveAccessibleDescription(props.message);
    expect(screen.getByRole('button', { name: props.cancelLabel })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Release' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it.each(['neutral', 'destructive'])('supports the %s variant', (variant) => {
    render(<ConfirmDialog {...props} variant={variant} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Release' })).toHaveClass(variant === 'destructive' ? 'bg-red-600' : 'bg-[#15803d]');
  });

  it.each(['button', 'Escape', 'backdrop', 'close'])('cancels through %s', async (method) => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...props} onCancel={onCancel} onConfirm={onConfirm} />);
    if (method === 'Escape') await user.keyboard('{Escape}');
    if (method === 'button') await user.click(screen.getByRole('button', { name: 'Keep Document' }));
    if (method === 'close') await user.click(screen.getByRole('button', { name: 'Close' }));
    if (method === 'backdrop') fireEvent.click(screen.getByRole('dialog').previousElementSibling);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('blocks confirmation and every dismissal path while loading, even above a form', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmDialog {...props} onCancel={onCancel} onConfirm={onConfirm} />);
    rerender(<ConfirmDialog {...props} loading loadingLabel="Releasing…" onCancel={onCancel} onConfirm={onConfirm} />);
    const dialog = screen.getByRole('dialog', { name: props.title });
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Releasing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep Document' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Releasing…' }));
    await user.click(screen.getByRole('button', { name: 'Keep Document' }));
    await user.keyboard('{Escape}');
    fireEvent.click(dialog.previousElementSibling);
    await user.tab();
    expect(dialog).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
