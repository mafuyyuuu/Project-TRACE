import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}));

import api from '@/services/api';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';

beforeEach(() => {
  // `restoreMocks` only restores vi.spyOn spies; the vi.fn() created by the
  // module factory above persists, so its call history must be reset by hand.
  api.get.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('toFilename', () => {
  it.each([
    ['/uploads/receipt.jpg', 'receipt.jpg'],
    ['C:\\uploads\\scan.pdf', 'scan.pdf'],
    ['/Users/jhervin/project-trace/backend/uploads/proof-1.jpg', 'proof-1.jpg'],
    ['bare.png', 'bare.png'],
  ])('reduces %s to %s', (input, expected) => {
    expect(toFilename(input)).toBe(expected);
  });

  it('returns an empty string for missing input', () => {
    expect(toFilename(null)).toBe('');
    expect(toFilename(undefined)).toBe('');
  });
});

describe('useAuthedFile', () => {
  it('requests nothing and stays idle when given no path', () => {
    const { result } = renderHook(() => useAuthedFile(null));
    expect(result.current).toEqual({ url: null, loading: false, error: '' });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('passes an external http URL straight through without a request', () => {
    const { result } = renderHook(() => useAuthedFile('https://example.com/avatar.svg'));
    expect(result.current.url).toBe('https://example.com/avatar.svg');
    expect(result.current.loading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches the protected file as a blob and exposes an object URL', async () => {
    const blob = new Blob(['x']);
    api.get.mockResolvedValue({ data: blob });

    const { result } = renderHook(() => useAuthedFile('/uploads/receipt.jpg'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.url).toBe('blob:generated-url'));
    expect(api.get).toHaveBeenCalledWith('/files/receipt.jpg', { responseType: 'blob' });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('requests only the basename, never a traversal path', async () => {
    api.get.mockResolvedValue({ data: new Blob(['x']) });
    renderHook(() => useAuthedFile('/uploads/../../.env'));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).toBe('/files/.env');
  });

  it('surfaces a 403 as an access message', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });

    const { result } = renderHook(() => useAuthedFile('/uploads/other.jpg'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatch(/do not have access/i);
    expect(result.current.url).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('reports a generic failure for other errors', async () => {
    api.get.mockRejectedValue({ response: { status: 500 } });

    const { result } = renderHook(() => useAuthedFile('/uploads/broken.jpg'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatch(/failed to load/i);
  });

  it('revokes the object URL on unmount so blobs are not leaked', async () => {
    api.get.mockResolvedValue({ data: new Blob(['x']) });

    const { result, unmount } = renderHook(() => useAuthedFile('/uploads/receipt.jpg'));
    await waitFor(() => expect(result.current.url).toBeTruthy());

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated-url');
  });

  it('refetches and shows loading again when the path changes', async () => {
    api.get.mockResolvedValue({ data: new Blob(['x']) });

    const { result, rerender } = renderHook(({ p }) => useAuthedFile(p), {
      initialProps: { p: '/uploads/first.jpg' },
    });
    await waitFor(() => expect(result.current.url).toBeTruthy());

    rerender({ p: '/uploads/second.jpg' });
    // the stale blob must not be shown for the new file
    expect(result.current.url).toBeNull();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.url).toBe('blob:generated-url'));
    expect(api.get).toHaveBeenLastCalledWith('/files/second.jpg', { responseType: 'blob' });
  });
});
