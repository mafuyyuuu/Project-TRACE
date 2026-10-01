import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import RequestAttachments from '@/components/RequestAttachments';
const state = vi.hoisted(() => ({ rows: [], loading: false, error: '', success: '', saving: false, staged: null, stage: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), refresh: vi.fn() }));
vi.mock('@/hooks/useRequestAttachments', () => ({ default: () => state }));
vi.mock('@/hooks/useAuthedFile', () => ({ default: () => ({ url: null }), toFilename: path => path || '' }));
beforeEach(() => { state.rows = []; state.error = ''; state.staged = null; state.saving = false; vi.clearAllMocks(); });
it('shows no fixed requirements until Registrar requests documents', () => {
  render(<RequestAttachments documentId={11} user={{ id: 3, role: 'student' }} />);
  expect(screen.getByText(/No additional documents requested/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Required document')).not.toBeInTheDocument();
});
it('lets Registrar stage a named case requirement with instructions', () => {
  render(<RequestAttachments documentId={11} user={{ id: 4, role: 'clerk', desk_assignment: 'Window 1' }} />);
  fireEvent.change(screen.getByLabelText('Required document'), { target: { value: 'School record' } });
  fireEvent.change(screen.getByLabelText('Case-specific instructions'), { target: { value: 'Scan both sides.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request additional document' }));
  expect(state.stage).toHaveBeenCalledWith({ kind: 'request', label: 'School record', instructions: 'Scan both sides.' });
});
it('lets students choose an attachment and submit only against its named requirement', () => {
  state.rows = [{ id: 9, label: 'School record', instructions: 'Scan both sides.', status: 'requested' }];
  render(<RequestAttachments documentId={11} user={{ id: 3, role: 'student' }} />);
  const file = new File(['test'], 'case.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Upload School record', { selector: 'input' }), { target: { files: [file] } });
  expect(state.stage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Submit pertinent document' }));
  expect(state.stage).toHaveBeenCalledWith({ kind: 'upload', id: 9, file });
  expect(screen.queryByRole('button', { name: 'Accept document' })).not.toBeInTheDocument();
});
it('requires a reason for resubmission and exposes errors for retry', () => {
  state.rows = [{ id: 9, label: 'School record', status: 'uploaded' }]; state.error = 'Unavailable';
  render(<RequestAttachments documentId={11} user={{ id: 5, role: 'clerk', desk_assignment: 'Secretary' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  expect(screen.getByRole('button', { name: 'Request resubmission' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Review notes'), { target: { value: 'Back page missing.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request resubmission' }));
  expect(state.stage).toHaveBeenCalledWith({ kind: 'review', id: 9, action: 'resubmit', notes: 'Back page missing.' });
});
