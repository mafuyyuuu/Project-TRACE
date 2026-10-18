import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The graduate form has no hardcoded questions — it renders whatever the
 * Registrar has configured. These tests prove that: changing the field
 * definitions changes the rendered form, with no code change.
 */

vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn(), getPrograms: vi.fn() }));
vi.mock('@/services/authService', () => ({ getMe: vi.fn().mockResolvedValue({ user: { id: 3, role: 'student', user_type: 'alumni', has_grad_application: 1 } }) }));
import * as reference from '@/services/referenceService';

vi.mock('@/services/gradService', () => ({
  getFormFields: vi.fn(),
  submitApplication: vi.fn(),
  getMyApplications: vi.fn(),
}));

import * as gradService from '@/services/gradService';
import GraduateApplication from '@/features/graduate/GraduateApplication';

const USER = { id: 3, role: 'student', full_name: 'Ana Reyes', student_id: 'STU2024001' };

const FIELDS = [
  { field_key: 'year_graduated', label: 'Year Graduated', field_type: 'number', is_required: 1, sort_order: 1 },
  { field_key: 'college', label: 'College', field_type: 'select', catalog: 'colleges', is_required: 1 },
  { field_key: 'program', catalog: 'programs', label: 'Degree Program', field_type: 'select', is_required: 1, sort_order: 2 },
  { field_key: 'purpose', label: 'Purpose', field_type: 'textarea', is_required: 0, sort_order: 3 },
];

beforeEach(() => {
  vi.clearAllMocks();
  reference.getColleges.mockResolvedValue({ colleges: [{ id: 1, name: 'College of Computer Studies' }, { id: 2, name: 'College of Education' }] });
  reference.getPrograms.mockResolvedValue({ programs: [{ id: 1, college_id: 1, name: 'BSIT' }, { id: 2, college_id: 1, name: 'Computer Science' }, { id: 3, college_id: 2, name: 'Elementary Education' }] });
  gradService.getFormFields.mockResolvedValue({ fields: FIELDS });
  gradService.getMyApplications.mockResolvedValue({ applications: [] });
  gradService.submitApplication.mockResolvedValue({ message: 'Graduate application submitted successfully.' });
});

const renderForm = async () => {
  const utils = render(<GraduateApplication user={USER} />);
  await waitFor(() =>
    expect(screen.queryByText(/Synchronizing Command Center/i)).not.toBeInTheDocument()
  );
  return utils;
};

describe('rendering an admin-defined form', () => {
  it('renders a control for every configured field', async () => {
    await renderForm();
    expect(await screen.findByLabelText(/Year Graduated/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Degree Program/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Purpose/)).toBeInTheDocument();
  });

  it('picks the input type from the field definition', async () => {
    await renderForm();
    expect(await screen.findByLabelText(/Year Graduated/)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/Year Graduated/)).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText(/Degree Program/).tagName).toBe('SELECT');
    // a textarea has no `type` attribute
    expect(screen.getByLabelText(/Purpose/).tagName).toBe('TEXTAREA');
  });

  it('marks only the required fields as required', async () => {
    await renderForm();
    expect(await screen.findByLabelText(/Year Graduated/)).toBeRequired();
    expect(screen.getByLabelText(/Purpose/)).not.toBeRequired();
  });

  it('adapts when the Registrar changes the fields — no code change', async () => {
    gradService.getFormFields.mockResolvedValue({
      fields: [
        { field_key: 'honors', label: 'Latin Honors', field_type: 'select', is_required: 0, sort_order: 1,
          options: JSON.stringify(['Cum Laude', 'Magna Cum Laude']) },
      ],
    });
    await renderForm();

    const select = await screen.findByLabelText(/Latin Honors/);
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Magna Cum Laude' })).toBeInTheDocument();
    // the previously configured fields are gone
    expect(screen.queryByLabelText(/Degree Program/)).not.toBeInTheDocument();
  });

  it('explains itself when the Registrar has not published the form yet', async () => {
    gradService.getFormFields.mockResolvedValue({ fields: [] });
    await renderForm();
    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument();
  });
});

describe('submitting', () => {
  it('sends the answers keyed by field', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(await screen.findByLabelText(/Year Graduated/), '2024');
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
    await user.selectOptions(screen.getByLabelText(/Degree Program/), 'BSIT');
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    expect(gradService.submitApplication).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm Submission' }));

    await waitFor(() => expect(gradService.submitApplication).toHaveBeenCalled());
    expect(gradService.submitApplication).toHaveBeenCalledWith(
      expect.objectContaining({ year_graduated: '2024', program: 'BSIT' })
    );
  });

  it('does not submit while a required field is empty', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(await screen.findByRole('button', { name: /submit application/i }));

    // Native constraint validation blocks the submit first (the inputs carry
    // `required`), and the hook's own check is the backstop behind it. Either
    // way, nothing reaches the server.
    expect(gradService.submitApplication).not.toHaveBeenCalled();
  });

  it('filters programs by College and clears only the old program when College changes', async () => {
    const user = userEvent.setup();
    await renderForm();
    await screen.findByRole('option', { name: 'College of Computer Studies' });
    expect(screen.getByLabelText(/Degree Program/)).toBeDisabled();
    await user.type(screen.getByLabelText(/Purpose/), 'Keep this application draft.');
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
    await user.selectOptions(screen.getByLabelText(/Degree Program/), 'BSIT');
    expect(screen.queryByRole('option', { name: 'Elementary Education' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Education');
    expect(screen.getByLabelText(/Degree Program/)).toHaveValue('');
    expect(screen.queryByRole('option', { name: 'BSIT' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Elementary Education' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Purpose/)).toHaveValue('Keep this application draft.');
  });

  it('blocks submission after a catalog error and can retry without losing draft answers', async () => {
    reference.getPrograms.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await renderForm();
    await user.type(await screen.findByLabelText(/Year Graduated/), '2024');
    expect(await screen.findByRole('button', { name: 'Retry choices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Application' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Retry choices' }));
    await screen.findByRole('option', { name: 'College of Computer Studies' });
    expect(screen.getByLabelText(/Year Graduated/)).toHaveValue('2024');
    expect(screen.getByRole('button', { name: 'Submit Application' })).toBeEnabled();
  });

  it('treats an accepted submission with failed history refresh as success and refreshes access', async () => {
    gradService.getMyApplications.mockResolvedValueOnce({ applications: [] }).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await renderForm();
    await user.type(await screen.findByLabelText(/Year Graduated/), '2024');
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
    await user.selectOptions(screen.getByLabelText(/Degree Program/), 'BSIT');
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm Submission' }));
    expect(await screen.findByRole('dialog', { name: 'Success' })).toHaveTextContent('Refresh to update application history.');
    expect(screen.queryByRole('dialog', { name: 'Confirm Graduate Application' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/College/)).toHaveValue('');
    expect(gradService.submitApplication).toHaveBeenCalledOnce();
  });

  it('requires a program selection before confirmation', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(await screen.findByLabelText(/Year Graduated/), '2024');
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
    await user.click(screen.getByRole('button', { name: /submit application/i }));

    expect(screen.queryByRole('dialog', { name: 'Confirm Graduate Application' })).not.toBeInTheDocument();
    expect(gradService.submitApplication).not.toHaveBeenCalled();
  });

  it('surfaces a server rejection to the student', async () => {
    const user = userEvent.setup();
    gradService.submitApplication.mockRejectedValue({
      response: { data: { error: 'Year Graduated must be a number.' } },
    });
    await renderForm();

    await user.type(await screen.findByLabelText(/Year Graduated/), '2024');
    await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
    await user.selectOptions(screen.getByLabelText(/Degree Program/), 'BSIT');
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    expect(gradService.submitApplication).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm Submission' }));

    expect(await screen.findByText(/must be a number/i)).toBeInTheDocument();
  });
});

describe('previous submissions', () => {
  it('lists them with their review status', async () => {
    gradService.getMyApplications.mockResolvedValue({
      applications: [
        { id: 7, status: 'approved', submitted_at: '2026-08-01T00:00:00.000Z' },
        { id: 8, status: 'under_review', submitted_at: '2026-08-10T00:00:00.000Z' },
      ],
    });
    await renderForm();

    expect(await screen.findByText('Application #7')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });

  it('says so when there are none', async () => {
    await renderForm();
    expect(await screen.findByText(/No applications submitted yet/i)).toBeInTheDocument();
  });
});

it.each(['-202', '20.5', '2e3', '2001', '9999', '202'])('keeps invalid graduation drafts visible and blocks application confirmation: %s', async value => {
  const user = userEvent.setup();
  await renderForm();
  const input = screen.getByLabelText(/Year Graduated/);
  await user.type(input, value);
  await user.selectOptions(screen.getByLabelText(/College/), 'College of Computer Studies');
  await user.selectOptions(screen.getByLabelText(/Degree Program/), 'BSIT');
  await user.click(screen.getByRole('button', { name: /submit application/i }));
  expect(input).toHaveValue(value);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(expect.stringContaining('Year Graduated must'));
  expect(screen.queryByRole('dialog', { name: 'Confirm Graduate Application' })).not.toBeInTheDocument();
  expect(gradService.submitApplication).not.toHaveBeenCalled();
});
