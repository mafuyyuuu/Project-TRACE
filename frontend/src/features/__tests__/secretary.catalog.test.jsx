import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '@/services/api';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import { STATUS } from '@/utils/documentStatus';

// Exercise the real reference service, Secretary hook, dashboard Review action
// and evaluation form together. Only unrelated dashboard I/O is replaced.
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('@/components/RequestMessagesPanel', () => ({ default: () => <div>Request discussion</div> }));
vi.mock('@/components/AuthedFilePreview', () => ({ default: () => <div>Synthetic scan preview</div> }));
vi.mock('@/hooks/useDashboardCore', async () => {
  const { useState } = await import('react');
  return {
    default: function useSyntheticCore() {
      const [selectedDoc, setSelectedDoc] = useState(null);
      const [activeModal, setActiveModal] = useState(null);
      return {
        documents: [request], dashStats: {}, loading: false,
        selectedDoc, setSelectedDoc, activeModal, setActiveModal,
        runAction: vi.fn(), triggerNotification: vi.fn(), dismissNotification: vi.fn(),
      };
    },
  };
});

const user = { id: 4, role: 'clerk', desk_assignment: 'Secretary' };
let request;
const catalog = [
  { id: 1, name: 'Certificate of Enrollment', base_fee: '50.00' },
  { id: 2, name: 'Transcript of Records for Employment', base_fee: '100.00' },
];

beforeEach(() => {
  vi.clearAllMocks();
  request = {
    id: 42, tracking_number: 'SYN-42', student_id: 'SYN-3', student_name: 'Synthetic Student',
    document_type: catalog[0].name, current_status: STATUS.PENDING_SEC_EVALUATION,
  };
  api.get.mockResolvedValue({ data: { document_types: catalog } });
});

function openReview() {
  render(<SecretaryDashboard user={user} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review' }));
  return screen.getByLabelText('Document Type');
}

it.each(['digital', 'scanned'])('opens %s Review with the active catalog and editable fields', async mode => {
  if (mode === 'scanned') request.file_path = 'synthetic-scan.jpg';
  const select = openReview();
  await within(select).findByRole('option', { name: catalog[1].name });
  expect(within(select).getAllByRole('option')).toHaveLength(2);
  expect(select).toHaveValue(request.document_type);
  expect(screen.getByLabelText('Student Name')).toHaveValue(request.student_name);
  expect(screen.getByLabelText('Student ID')).toHaveValue(request.student_id);
  fireEvent.change(select, { target: { value: catalog[1].name } });
  expect(select).toHaveValue(catalog[1].name);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/reference/document-types');
});

it('retains an older request type that is absent from the active catalog', async () => {
  request.document_type = 'Historical document type';
  const select = openReview();
  await within(select).findByRole('option', { name: catalog[1].name });
  expect(select).toHaveValue('Historical document type');
  expect(within(select).getAllByRole('option')).toHaveLength(3);
});

it('keeps the requested type when the active catalog is empty', async () => {
  api.get.mockResolvedValue({ data: { document_types: [] } });
  const select = openReview();
  await act(async () => {});
  expect(select).toHaveValue(request.document_type);
  expect(within(select).getAllByRole('option')).toHaveLength(1);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([
  ['digital', 'network'], ['scanned', 'network'],
  ['digital', 'malformed'], ['scanned', 'malformed'],
])('shows a catalog error in %s Review after a %s failure without losing the request', async (mode, failure) => {
  if (mode === 'scanned') request.file_path = 'synthetic-scan.jpg';
  if (failure === 'network') api.get.mockRejectedValue(new Error('Synthetic network failure'));
  else api.get.mockResolvedValue({ data: { document_types: [null] } });
  const select = openReview();
  expect(await screen.findByRole('alert')).toHaveTextContent('Document catalog could not be loaded. Refresh the dashboard to try again.');
  expect(select).toHaveValue(request.document_type);
  expect(screen.getByLabelText('Student Name')).toHaveValue(request.student_name);
  expect(screen.getByRole('button', { name: 'Accept for Processing' })).toBeEnabled();
});

it('lets Review open while the catalog is pending and preserves edits when it arrives', async () => {
  let resolveCatalog;
  api.get.mockReturnValue(new Promise(resolve => { resolveCatalog = resolve; }));
  const select = openReview();
  expect(select).toHaveValue(request.document_type);
  fireEvent.change(screen.getByLabelText('Secretary Notes'), { target: { value: 'Retained evaluation notes' } });
  await act(async () => resolveCatalog({ data: { document_types: catalog } }));
  expect(within(select).getAllByRole('option')).toHaveLength(2);
  expect(screen.getByLabelText('Secretary Notes')).toHaveValue('Retained evaluation notes');
});
