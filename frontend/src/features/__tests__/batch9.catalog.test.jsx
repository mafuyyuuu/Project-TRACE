import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaintenancePanel from '@/features/admin/components/MaintenancePanel';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import HelpPage from '@/pages/HelpPage';

const { maintenance } = vi.hoisted(() => ({ maintenance: {
  loading: false, saving: false, accounts: [], staff: [], colleges: [], paymentMethods: [],
  selectedUser: null, editingUser: null, addingUser: false, success: '', error: '',
  documentTypes: [
    { id: 1, name: 'Certificate of Good Moral', base_fee: 50, is_active: false, is_retired: true },
    { id: 2, name: 'Diploma', base_fee: 250, is_active: true, is_retired: false },
  ],
  handleToggleDocumentTypeActive: vi.fn(), updateDocumentType: vi.fn(),
} }));
vi.mock('@/features/admin/useMaintenance', () => ({ default: () => maintenance }));

beforeEach(() => {
  vi.clearAllMocks();
  maintenance.updateDocumentType.mockResolvedValue(true);
});

it('keeps retired historical entries visible with inaccessible edit and restore actions', async () => {
  const user = userEvent.setup();
  render(<MaintenancePanel user={{ id: 1, role: 'admin' }} currentTab="maintenance" />);
  await user.click(screen.getByRole('button', { name: /^Document Types/ }));
  const row = screen.getByText('Certificate of Good Moral').closest('tr');
  expect(within(row).getByText('Unavailable for new requests; history retained.')).toBeInTheDocument();
  expect(within(row).getByRole('button', { name: 'Edit' })).toBeDisabled();
  expect(within(row).getByRole('button', { name: 'Retired' })).toBeDisabled();
  expect(within(row).queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
  await user.click(within(row).getByRole('button', { name: 'Retired' }));
  expect(maintenance.handleToggleDocumentTypeActive).not.toHaveBeenCalled();
});

it('labels the Diploma fee and preserves its editable, confirmed save flow', async () => {
  const user = userEvent.setup();
  render(<MaintenancePanel user={{ id: 1, role: 'admin' }} currentTab="maintenance" />);
  await user.click(screen.getByRole('button', { name: /^Document Types/ }));
  const row = screen.getByText('Diploma').closest('tr');
  expect(row).toHaveTextContent('₱250.00');
  expect(row).toHaveTextContent('Reissue Fee · Secretary sets final amount');
  within(row).getByRole('button', { name: 'Edit' }).focus();
  await user.keyboard('{Enter}');
  const fee = screen.getByPlaceholderText('Base fee (₱)');
  await user.clear(fee);
  await user.type(fee, '325');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  const dialog = screen.getByRole('dialog', { name: 'Confirm Document Type' });
  expect(maintenance.updateDocumentType).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(maintenance.updateDocumentType).toHaveBeenCalledWith(2, expect.objectContaining({ name: 'Diploma', base_fee: '325' }));
});

it.each([250, 325])('shows the configured Diploma reissue fee of %s without making it a fixed final price', fee => {
  render(<NewRequestModal user={{ role: 'student', user_type: 'alumni' }}
    documentTypes={[{ name: 'Diploma', available_to: 'alumni', base_fee: fee }]}
    selections={{}} toggleDocumentType={vi.fn()} updateSelection={vi.fn()}
    setActiveModal={vi.fn()} handleStudentSubmitRequest={vi.fn()} />);
  expect(screen.getByText('(Reissue Fee)')).toBeInTheDocument();
  expect(screen.getByText(`₱${fee.toFixed(2)}`)).toBeInTheDocument();
});

it('keeps student and Admin guidance aligned with retirement and editable fees', () => {
  const { rerender } = render(<HelpPage user={{ role: 'student' }} />);
  expect(screen.getByText(/Good Moral certificates are no longer available for new requests/)).toBeInTheDocument();
  expect(screen.getByText(/The default is ₱250/)).toBeInTheDocument();
  rerender(<HelpPage user={{ role: 'admin' }} />);
  expect(screen.getByText(/Good Moral types are retired and cannot be restored or edited/)).toBeInTheDocument();
});
