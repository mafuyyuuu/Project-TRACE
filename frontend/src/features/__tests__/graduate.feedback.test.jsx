import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GraduateApplication from '@/features/graduate/GraduateApplication';
import * as gradService from '@/services/gradService';

vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn(), getPrograms: vi.fn() }));
vi.mock('@/services/authService', () => ({ getMe: vi.fn().mockResolvedValue({ user: { id: 3, role: 'student', user_type: 'alumni', has_grad_application: 1 } }) }));
import * as reference from '@/services/referenceService';

vi.mock('@/services/gradService', () => ({
  getFormFields: vi.fn(),
  getMyApplications: vi.fn(),
  submitApplication: vi.fn(),
}));

const USER = { id: 3, role: 'student', user_type: 'alumni' };
const FIELDS = [
  { field_key: 'name', label: 'Full name', field_type: 'text', is_required: true },
  { field_key: 'college', label: 'College', field_type: 'select', catalog: 'colleges', is_required: 1 },
  { field_key: 'program', catalog: 'programs', label: 'Program', field_type: 'select', is_required: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  reference.getColleges.mockResolvedValue({ colleges: [{ id: 1, name: 'College of Computer Studies' }, { id: 2, name: 'College of Education' }] });
  reference.getPrograms.mockResolvedValue({ programs: [{ id: 1, college_id: 1, name: 'BSIT' }, { id: 2, college_id: 1, name: 'Computer Science' }, { id: 3, college_id: 2, name: 'Elementary Education' }] });
  gradService.getFormFields.mockResolvedValue({ fields: FIELDS });
  gradService.getMyApplications.mockResolvedValue({ applications: [] });
});

describe('Graduate application feedback', () => {
  it('dismisses required-field feedback without discarding the draft', async () => {
    render(<GraduateApplication user={USER} />);
    const name = await screen.findByRole('textbox', { name: /Full name/ });
    await screen.findByRole('option', { name: 'College of Computer Studies' });
    fireEvent.change(name, { target: { value: 'Ana Reyes' } });
    const submit = screen.getByRole('button', { name: 'Submit Application' });
    submit.focus();
    // Submit directly to exercise the hook's required-field check.
    fireEvent.submit(submit.closest('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Please complete: College, Program.');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(name).toHaveValue('Ana Reyes');
    expect(submit).toHaveFocus();
    expect(gradService.submitApplication).not.toHaveBeenCalled();
  });

  it.each(['success', 'error'])('dismisses submission %s feedback', async (outcome) => {
    if (outcome === 'success') gradService.submitApplication.mockResolvedValueOnce({ message: 'Application received.' });
    else gradService.submitApplication.mockRejectedValueOnce({ response: { data: { error: 'Please try again later.' } } });
    render(<GraduateApplication user={USER} />);
    fireEvent.change(await screen.findByRole('textbox', { name: /Full name/ }), { target: { value: 'Ana Reyes' } });
    await screen.findByRole('option', { name: 'College of Computer Studies' });
    fireEvent.change(screen.getByRole('combobox', { name: /College/ }), { target: { value: 'College of Computer Studies' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Program/ }), { target: { value: 'Computer Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(gradService.submitApplication).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submission' }));
    const title = outcome === 'success' ? 'Success' : 'Attention Needed';
    expect(await screen.findByRole('dialog', { name: title })).toHaveTextContent(
      outcome === 'success' ? 'Application received.' : 'Please try again later.'
    );
    expect(gradService.submitApplication).toHaveBeenCalledWith({ name: 'Ana Reyes', college: 'College of Computer Studies', program: 'Computer Science' });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    if (outcome === 'error') {
      expect(screen.getByRole('dialog', { name: 'Confirm Graduate Application' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(outcome === 'success' ? '' : 'Ana Reyes');
  });
});
