import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupPage from '@/pages/SignupPage';
import { getColleges, getPrograms } from '@/services/referenceService';
import { PRIVACY_NOTICE_VERSION } from '@/utils/registrationPrivacy';

const { register } = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ default: () => ({ register, loading: false }) }));
vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn(), getPrograms: vi.fn() }));
const programs = [
  { id: 11, college_id: 1, name: 'BS Information Technology' },
  { id: 12, college_id: 1, name: 'BS Computer Science' },
  { id: 21, college_id: 2, name: 'Bachelor of Secondary Education major in Mathematics' },
];
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/signup');
  getColleges.mockResolvedValue({ colleges: [{ id: 1, name: 'College of Computer Studies' }, { id: 2, name: 'College of Education' }] });
  getPrograms.mockResolvedValue({ programs });
  register.mockResolvedValue({ message: 'Received.' });
});
const start = () => render(<MemoryRouter><SignupPage /></MemoryRouter>);
async function fillDraft(container) {
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  fireEvent.change(screen.getByLabelText('College *'), { target: { value: 'College of Computer Studies' } });
  fireEvent.change(screen.getByLabelText('Program/Course *'), { target: { value: programs[0].name } });
  for (const [placeholder, value] of [['e.g. 23-00123', 'SYN-0001'], ['juan@plp.edu.ph', 'synthetic@example.test'], ['09123456789', '09123456789'], ['Create a password', 'Trace_2026'], ['Confirm your password', 'Trace_2026']]) {
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Synthetic' } });
  fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Student' } });
  await userEvent.upload(container.querySelector('input[type=file]'), new File(['synthetic'], 'proof.png', { type: 'image/png' }));
}
it('loads the managed catalog, limits programs by college, and clears the old choice on a college change', async () => {
  start();
  expect(screen.getByLabelText('Program/Course *')).toBeDisabled();
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  await userEvent.selectOptions(screen.getByLabelText('College *'), 'College of Computer Studies');
  expect(screen.getByRole('option', { name: programs[0].name })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: programs[2].name })).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Program/Course *'), programs[0].name);
  await userEvent.selectOptions(screen.getByLabelText('College *'), 'College of Education');
  expect(screen.getByLabelText('Program/Course *')).toHaveValue('');
  expect(screen.queryByRole('option', { name: programs[0].name })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: programs[2].name })).toBeInTheDocument();
});
it('requires an unchecked acknowledgment, opens the actual notice without losing the draft, and sends its version only on confirmation', async () => {
  const { container } = start();
  await fillDraft(container);
  const acknowledgment = screen.getByRole('checkbox', { name: /I have read and acknowledge/ });
  expect(acknowledgment).not.toBeChecked();
  fireEvent.submit(container.querySelector('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Read and acknowledge the Privacy Notice');
  expect(register).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Read Privacy Notice' }));
  const notice = screen.getByRole('dialog', { name: 'Registration Privacy Notice' });
  expect(notice).toHaveTextContent(PRIVACY_NOTICE_VERSION);
  expect(notice).toHaveTextContent('does not automatically delete registration proof');
  expect(notice).toHaveTextContent('OCR');
  await userEvent.click(within(notice).getByRole('button', { name: 'Close Notice' }));
  expect(screen.getByPlaceholderText('e.g. 23-00123')).toHaveValue('SYN-0001');
  expect(acknowledgment).not.toBeChecked();
  await userEvent.click(acknowledgment);
  fireEvent.submit(container.querySelector('form'));
  const review = screen.getByRole('dialog', { name: 'Confirm Registration' });
  expect(review).toHaveTextContent('BS Information Technology');
  expect(review).toHaveTextContent('Acknowledged · ' + PRIVACY_NOTICE_VERSION);
  expect(register).not.toHaveBeenCalled();
  await userEvent.click(within(review).getByRole('button', { name: 'Submit Registration' }));
  await waitFor(() => expect(register).toHaveBeenCalledOnce());
  const body = register.mock.calls[0][0];
  expect(body.get('privacy_acknowledged')).toBe('true');
  expect(body.get('privacy_notice_version')).toBe(PRIVACY_NOTICE_VERSION);
  expect(body.get('program')).toBe(programs[0].name);
});
it('allows retry after a catalog failure while preserving entered identity details', async () => {
  getPrograms.mockRejectedValueOnce(new Error('offline'));
  start();
  fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Synthetic' } });
  await screen.findByRole('button', { name: 'Retry Catalog' });
  expect(screen.getByLabelText('College *')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Retry Catalog' }));
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  expect(screen.getByLabelText('College *')).toBeEnabled();
  expect(screen.getByLabelText('First Name *')).toHaveValue('Synthetic');
  expect(getPrograms).toHaveBeenCalledTimes(2);
});
it('shows an actionable empty catalog instead of permitting a free-text program', async () => {
  getPrograms.mockResolvedValue({ programs: [] });
  start();
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  await userEvent.selectOptions(screen.getByLabelText('College *'), 'College of Computer Studies');
  expect(screen.getByLabelText('Program/Course *')).toBeDisabled();
  expect(screen.getByText(/No active programs are listed for this college/)).toBeInTheDocument();
  expect(register).not.toHaveBeenCalled();
});
it('shows accepted proof documents, formats and size, rejecting incompatible or oversized replacements without losing the valid draft', async () => {
  const { container } = start();
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  expect(screen.getByText(/Accepted files: JPG, JPEG, PNG or PDF. Maximum size: 10 MB/)).toBeInTheDocument();
  const picker = screen.getByLabelText('Proof of ID', { selector: 'input' });
  expect(picker).toHaveAttribute('accept', '.pdf,.png,.jpg,.jpeg');
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(picker, new File(['synthetic'], 'proof.png', { type: 'image/png' }));
  await user.upload(picker, new File(['synthetic'], 'proof.docx', { type: 'application/octet-stream' }));
  expect(screen.getByRole('alert')).toHaveTextContent('supported image or PDF');
  expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();
  await user.upload(picker, new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));
  expect(screen.getByRole('alert')).toHaveTextContent('limit');
  expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();
  expect(container.querySelector('form')).toBeInTheDocument();
});
