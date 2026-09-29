import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GraduateApplication from '@/features/graduate/GraduateApplication';
import * as gradService from '@/services/gradService';

vi.mock('@/services/gradService', () => ({
  getFormFields: vi.fn(),
  getMyApplications: vi.fn(),
  submitApplication: vi.fn(),
}));

const USER = { id: 3, role: 'student', user_type: 'alumni' };
const FIELDS = [
  { field_key: 'name', label: 'Full name', field_type: 'text', is_required: true },
  { field_key: 'program', label: 'Program', field_type: 'text', is_required: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  gradService.getFormFields.mockResolvedValue({ fields: FIELDS });
  gradService.getMyApplications.mockResolvedValue({ applications: [] });
});

describe('Graduate application feedback', () => {
  it('dismisses required-field feedback without discarding the draft', async () => {
    render(<GraduateApplication user={USER} />);
    const name = await screen.findByRole('textbox', { name: /Full name/ });
    fireEvent.change(name, { target: { value: 'Ana Reyes' } });
    const submit = screen.getByRole('button', { name: 'Submit Application' });
    submit.focus();
    // Submit directly to exercise the hook's required-field check.
    fireEvent.submit(submit.closest('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Please complete: Program.');
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
    fireEvent.change(screen.getByRole('textbox', { name: /Program/ }), { target: { value: 'Computer Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));
    const title = outcome === 'success' ? 'Success' : 'Attention Needed';
    expect(await screen.findByRole('dialog', { name: title })).toHaveTextContent(
      outcome === 'success' ? 'Application received.' : 'Please try again later.'
    );
    expect(gradService.submitApplication).toHaveBeenCalledWith({ name: 'Ana Reyes', program: 'Computer Science' });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(outcome === 'success' ? '' : 'Ana Reyes');
  });
});
