import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
const state = vi.hoisted(() => ({ threads: [], total: 0, loading: false, error: '', retry: vi.fn() }));
vi.mock('@/hooks/useDocumentChat', () => ({ useMessageThreads: () => state }));
vi.mock('@/components/DocumentChat', () => ({ default: ({ documentId }) => <div>Conversation {documentId}</div> }));
vi.mock('@/components/RequestAttachments', () => ({ default: ({ documentId }) => <div>Attachments {documentId}</div> }));
beforeEach(() => { state.threads = []; state.total = 0; state.error = ''; vi.clearAllMocks(); });
it('shows an actionable empty state instead of hiding support', () => {
  render(<RequestMessagesPanel user={{ id: 3, role: 'student' }} />);
  expect(screen.getByText(/File a document request first/)).toBeInTheDocument();
});
it('lets Window 1 choose a request and reply even before its first message', () => {
  state.threads = [{ id: 11, tracking_number: 'TRC-TEST', document_type: 'TOR', student_name: 'Student', unread_count: 2 }];
  state.total = 1;
  render(<RequestMessagesPanel user={{ id: 4, role: 'clerk' }} />);
  expect(screen.getByRole('option', { name: /2 unread/ })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
  expect(screen.getByText('Conversation 11')).toBeInTheDocument();
  expect(screen.getByText('Attachments 11')).toBeInTheDocument();
});
it('opens a notification target outside the current inbox page', () => {
  render(<RequestMessagesPanel user={{ id: 3, role: 'student' }} initialDocumentId="42" />);
  expect(screen.getByText('Conversation 42')).toBeInTheDocument();
});
it('exposes inbox failures and retry', () => {
  state.error = 'Unavailable';
  render(<RequestMessagesPanel user={{ id: 4, role: 'clerk' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry conversations' }));
  expect(state.retry).toHaveBeenCalledOnce();
});
