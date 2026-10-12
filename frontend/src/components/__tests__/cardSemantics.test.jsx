import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserCard from '@/components/UserCard';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import useAuthedFile from '@/hooks/useAuthedFile';

vi.mock('@/hooks/useAuthedFile', () => ({
  default: vi.fn(), toFilename: path => String(path).split('/').pop(),
}));
const user = { id: 9, full_name: 'Synthetic User', role: 'student', student_id: 'TEST-9', is_active: 1 };

describe('card semantics', () => {
  it('keeps a card without an action informational and outside the tab order', () => {
    useAuthedFile.mockReturnValue({ url: null, loading: false });
    render(<UserCard user={user} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('user-card').tagName).toBe('ARTICLE');
    expect(screen.getByTestId('user-card')).not.toHaveAttribute('tabindex');
    expect(screen.getByText('Synthetic User')).toBeInTheDocument();
  });

  it('preserves native keyboard detail activation and account/status data', async () => {
    useAuthedFile.mockReturnValue({ url: null, loading: false });
    const action = vi.fn();
    render(<UserCard user={{ ...user, verification_status: 'rejected' }} onClick={action} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('type', 'button');
    expect(card).toHaveAttribute('data-user-id', '9');
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    card.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('uses a native preview button without submitting its enclosing form', async () => {
    useAuthedFile.mockReturnValue({ url: 'blob:synthetic', loading: false });
    const open = vi.fn(), submit = vi.fn(event => event.preventDefault());
    render(<form onSubmit={submit}><AuthedFilePreview path="proof.jpg" alt="Proof" onClick={open} wrapperClassName="w-full" /></form>);
    const card = screen.getByRole('button', { name: 'Open Proof' });
    expect(card.tagName).toBe('BUTTON');
    expect(card).toHaveClass('w-full', 'trace-card-inset');
    card.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(open).toHaveBeenCalledTimes(2);
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    { url: null, loading: true }, { url: null, loading: false, error: 'Unavailable' },
  ])('does not create actions for loading/error previews', result => {
    useAuthedFile.mockReturnValue(result);
    render(<AuthedFilePreview path="proof.jpg" onClick={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps unclickable images and embedded PDFs outside card-action semantics', () => {
    useAuthedFile.mockReturnValue({ url: 'blob:synthetic', loading: false });
    const { rerender } = render(<AuthedFilePreview path="proof.jpg" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<AuthedFilePreview path="proof.pdf" onClick={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTitle('Document preview').tagName).toBe('IFRAME');
  });
});
