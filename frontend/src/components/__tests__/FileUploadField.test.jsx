import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUploadField from '@/components/FileUploadField';
vi.mock('@/hooks/useAuthedFile', () => ({ default: () => ({ url: null, loading: false, error: '' }) }));

describe('FileUploadField', () => {
  it('keeps camera-only selection hidden while retaining validation and staging', () => {
    const change = vi.fn();
    render(<FileUploadField pickerOnly label="Avatar" onChange={change} accept="image/png" maxBytes={5} />);
    const input = screen.getByLabelText('Avatar');
    expect(input).not.toBeVisible();
    expect(screen.queryByRole('region', { name: 'Avatar' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { files: [new File(['x'], 'bad.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('supported image');
    fireEvent.change(input, { target: { files: [new File(['123456'], 'big.png', { type: 'image/png' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('exceeds');
    expect(change).not.toHaveBeenCalled();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(change).toHaveBeenCalledExactlyOnceWith(file);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('stages a valid file locally without clearing the controlled selection', async () => {
    const change = vi.fn();
    const file = new File(['proof'], 'proof.png', { type: 'image/png' });
    const { rerender, unmount } = render(<FileUploadField label="Proof" onChange={change} />);
    fireEvent.change(screen.getByLabelText('Proof', { selector: 'input' }), { target: { files: [file] } });
    expect(change).toHaveBeenCalledExactlyOnceWith(file);
    rerender(<FileUploadField label="Proof" file={file} onChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('Selected: proof.png');
    expect(screen.queryByText('No file chosen')).not.toBeInTheDocument();
    expect(screen.getByText('Replace file')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Proof', {selector:'input'}), {target:{files:[]}});
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

it('opens a staged receipt without uploading it and returns to the same draft',async()=>{
 const file=new File(['receipt'],'receipt.png',{type:'image/png'}),change=vi.fn();
 const {rerender}=render(<FileUploadField label="Receipt" file={file} onChange={change}/>);
 fireEvent.click(await screen.findByRole('button',{name:'View Receipt preview'}));
 expect(screen.getByRole('dialog',{name:'Image preview'})).toBeInTheDocument();expect(screen.getByAltText('Enlarged Receipt preview')).toHaveAttribute('src',screen.getByAltText('Receipt preview').getAttribute('src'));
 fireEvent.click(screen.getByRole('dialog',{name:'Image preview'}).querySelector('button[aria-label="Close"]'));expect(screen.getByRole('status')).toHaveTextContent('receipt.png');expect(change).not.toHaveBeenCalled();
 rerender(<FileUploadField label="Receipt" file={new File(['new'],'replacement.png',{type:'image/png'})} onChange={change}/>);
 expect(screen.queryByRole('dialog',{name:'Image preview'})).not.toBeInTheDocument();
});
