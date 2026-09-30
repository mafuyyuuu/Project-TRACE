import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUploadField from '@/components/FileUploadField';
vi.mock('@/hooks/useAuthedFile', () => ({ default: () => ({ url: null, loading: false, error: '' }) }));

describe('FileUploadField', () => {
  it('stages a valid file locally without clearing the controlled selection', async () => {
    const change = vi.fn();
    const file = new File(['proof'], 'proof.png', { type: 'image/png' });
    const { rerender, unmount } = render(<FileUploadField label="Proof" onChange={change} />);
    fireEvent.change(screen.getByLabelText('Proof', { selector: 'input' }), { target: { files: [file] } });
    expect(change).toHaveBeenCalledExactlyOnceWith(file);
    rerender(<FileUploadField label="Proof" file={file} onChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('Selected: proof.png');
    expect(screen.getByText(/Selected locally/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText('Proof preview')).toHaveAttribute('src'));
    const url = screen.getByAltText('Proof preview').getAttribute('src');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    unmount();
    expect(revoke).toHaveBeenCalledWith(url);
  });
  it.each([
    [new File(['bad'], 'script.txt', { type: 'text/plain' }), /supported image/],
    [new File(['oversize'], 'big.png', { type: 'image/png' }), /exceeds/],
  ])('rejects invalid selections without replacing the existing draft', (file, message) => {
    const change = vi.fn();
    render(<FileUploadField label="Proof" onChange={change} maxBytes={5} />);
    fireEvent.change(screen.getByLabelText('Proof', { selector: 'input' }), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(change).not.toHaveBeenCalled();
  });
  it('does not offer replacement when the current workflow disallows it', () => {
    render(<FileUploadField label="Proof" path="proof.pdf" allowReplace={false} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Proof', { selector: 'input' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Uploaded: proof.pdf');
  });
});
