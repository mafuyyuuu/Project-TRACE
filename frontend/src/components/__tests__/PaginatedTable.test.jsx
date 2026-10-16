import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import PaginatedTable from '@/components/PaginatedTable';

function Records({ rows, onSelect }) {
  return <PaginatedTable label="requests" aria-label="Saved requests"><thead><tr><th>Request</th><th>Action</th></tr></thead><tbody>{rows.map(id => <tr key={id}><td>Request {id}</td><td><button onClick={() => onSelect(id)}>Open {id}</button></td></tr>)}</tbody></PaginatedTable>;
}

it('pages every record with its original action, and resets when filters change', () => {
  const onSelect = vi.fn();
  const rows = Array.from({ length: 19 }, (_, i) => i + 1);
  const { rerender } = render(<Records rows={rows} onSelect={onSelect} />);
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(9);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Showing 17–19 of 19 requests')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open 19' }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(19);
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  rerender(<Records rows={[2, 3]} onSelect={onSelect} />);
  expect(screen.getByText('Showing 1–2 of 2 requests')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.queryByText('Request 19')).not.toBeInTheDocument();
});

it('keeps empty and small tables paginated without counting the empty message as a record', () => {
  render(<PaginatedTable label="requests"><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td colSpan={2}>No requests</td></tr></tbody></PaginatedTable>);
  expect(screen.getByText('No requests')).toBeInTheDocument();
  expect(screen.getByText('Showing 0–0 of 0 requests')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});
