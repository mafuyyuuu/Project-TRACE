import { useState } from 'react';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import useViewportPagination from '@/hooks/useViewportPagination';
let observers, rowHeight;
function Table() {
  const [page, setPage] = useState(1);
  const { containerRef, pageSize, page: safePage } = useViewportPagination({ page, setPage, total: 100 });
  return <main><div ref={containerRef}><table><thead><tr><th>Title</th></tr></thead><tbody><tr><td>Row</td></tr></tbody></table></div><output>{safePage}:{pageSize}</output><button onClick={() => setPage(2)}>Next</button></main>;
}
beforeEach(() => {
  vi.useFakeTimers(); observers = []; rowHeight = 40;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { observers.push(callback); } observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () { return { height: this.tagName === 'THEAD' ? 40 : rowHeight }; });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('adjusts row capacity on resize while preserving the current first-row position', async () => {
  render(<Table />);
  await act(async () => vi.runOnlyPendingTimers());
  expect(screen.getByRole('status')).toHaveTextContent('1:11');
  fireEvent.click(screen.getByText('Next'));
  await act(async () => vi.runOnlyPendingTimers());
  Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
  act(() => window.dispatchEvent(new Event('resize')));
  await act(async () => vi.runOnlyPendingTimers());
  expect(screen.getByRole('status')).toHaveTextContent('3:5');
});
it('uses taller measured rows conservatively without oscillating on a shorter next page', async () => {
  render(<Table />); await act(async () => vi.runOnlyPendingTimers());
  rowHeight = 80; act(() => observers.at(-1)()); await act(async () => vi.runOnlyPendingTimers());
  expect(screen.getByRole('status')).toHaveTextContent('1:5');
  rowHeight = 40; act(() => observers.at(-1)()); await act(async () => vi.runOnlyPendingTimers());
  expect(screen.getByRole('status')).toHaveTextContent('1:5');
});
