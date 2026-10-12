import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import ProgramsPanel from '@/features/admin/components/ProgramsPanel';
import { getPrograms, createProgram, setProgramActive } from '@/services/maintenanceService';
vi.mock('@/services/maintenanceService', () => ({ getPrograms: vi.fn(), createProgram: vi.fn(), setProgramActive: vi.fn() }));
const row = { id: 8, college_id: 1, college_name: 'College A', college_active: 1, name: 'Approved Program', is_active: 1 };
beforeEach(() => {
  getPrograms.mockResolvedValue({ programs: [row] });
  createProgram.mockResolvedValue({ message: 'Program added.' });
  setProgramActive.mockResolvedValue({ message: 'Program deactivated.' });
});
function show() { return render(<ProgramsPanel colleges={[{ id: 1, name: 'College A', is_active: 1 }, { id: 2, name: 'Inactive College', is_active: 0 }]} />); }
it('exposes only active colleges and waits for confirmation before adding an approved program', async () => {
  show(); await screen.findByText('Approved Program');
  expect(screen.queryByRole('option', { name: 'Inactive College' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('College'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Approved Program Name'), { target: { value: ' Another Program ' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add Program' }).closest('form'));
  expect(createProgram).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Approved Program Name')).toHaveValue(' Another Program ');
  fireEvent.submit(screen.getByRole('button', { name: 'Add Program' }).closest('form'));
  fireEvent.click(screen.getAllByRole('button', { name: 'Add Program' }).at(-1));
  await waitFor(() => expect(createProgram).toHaveBeenCalledExactlyOnceWith({ college_id: '1', name: 'Another Program' }));
  await waitFor(() => expect(screen.getByLabelText('Approved Program Name')).toHaveValue(''));
});
it('keeps a failed creation draft and confirmation', async () => {
  createProgram.mockRejectedValueOnce({ response: { data: { error: 'Program already exists.' } } });
  show(); await screen.findByText('Approved Program');
  fireEvent.change(screen.getByLabelText('College'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Approved Program Name'), { target: { value: 'Draft Program' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add Program' }).closest('form'));
  fireEvent.click(screen.getAllByRole('button', { name: 'Add Program' }).at(-1));
  await screen.findByText('Program already exists.');
  expect(screen.getByLabelText('Approved Program Name')).toHaveValue('Draft Program');
  expect(screen.getByRole('heading', { name: 'Add Approved Program' })).toBeInTheDocument();
});
it('confirms deactivation and blocks duplicate mutations while pending', async () => {
  let resolve;
  setProgramActive.mockReturnValue(new Promise(done => { resolve = done; }));
  show(); await screen.findByText('Approved Program');
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
  expect(setProgramActive).not.toHaveBeenCalled();
  const button = screen.getAllByRole('button', { name: 'Deactivate' }).at(-1);
  fireEvent.click(button); fireEvent.click(button);
  expect(setProgramActive).toHaveBeenCalledExactlyOnceWith(8, false);
  expect(button).toBeDisabled();
  resolve({ message: 'Program deactivated.' });
  await screen.findByText('Program deactivated.');
});
it('keeps load-failure feedback and retry available independently of acknowledgment dialogs', async () => {
  getPrograms.mockRejectedValueOnce(new Error('offline'));
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Programs could not be loaded');
  expect(screen.getByText('Program list unavailable.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry Programs' }));
  await screen.findByText('Approved Program');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
