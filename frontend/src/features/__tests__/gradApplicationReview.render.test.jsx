import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * A submitted Graduate Application only ever showed up on the alumnus's own
 * account — nothing let staff act on it. These tests cover the shared review
 * panel dropped into both the Admin and Secretary dashboards.
 */

vi.mock('@/services/gradService', () => ({
  getApplications: vi.fn(),
  getApplication: vi.fn(),
  reviewApplication: vi.fn(),
}));

import * as gradService from '@/services/gradService';
import GradApplicationReviewPanel from '@/features/graduate/components/GradApplicationReviewPanel';

const ADMIN = { id: 8, role: 'admin' };

const APPLICATIONS = [
  { id: 1, student_id: 'STU2024001', full_name: 'Ana Reyes', course: 'BSIT', status: 'submitted', submitted_at: '2026-08-01T00:00:00.000Z' },
  { id: 2, student_id: 'STU2024002', full_name: 'Mia Cruz', course: 'BSCS', status: 'approved', submitted_at: '2026-07-15T00:00:00.000Z' },
  { id: 3, student_id: 'STU2024003', full_name: 'Leo Santos', course: 'BSA', status: 'rejected', submitted_at: '2026-07-20T00:00:00.000Z' },
];

const ANSWERS = [
  { field_key: 'year_graduated', label: 'Year Graduated', value: '2024' },
  { field_key: 'program', label: 'Degree Program', value: 'BSIT' },
  { field_key: 'contact_email', label: 'Contact Email', value: 'ana@plp.edu.ph' },
  { field_key: 'contact_number', label: 'Contact Number', value: '' },
  { field_key: 'current_employer', label: 'Current Employer', value: '' },
  { field_key: 'purpose', label: 'Purpose of Application', value: 'Job application' },
];

beforeEach(() => {
  vi.clearAllMocks();
  gradService.getApplications.mockResolvedValue({ applications: APPLICATIONS });
  gradService.getApplication.mockResolvedValue({ application: APPLICATIONS[0], answers: ANSWERS });
  gradService.reviewApplication.mockResolvedValue({ message: 'Application marked approved.' });
});

const renderPanel = async () => {
  const utils = render(<GradApplicationReviewPanel user={ADMIN} currentTab="admin-grad-applications" />);
  await waitFor(() => expect(gradService.getApplications).toHaveBeenCalled());
  return utils;
};

describe('queue tabs', () => {
  it('buckets applications into pending, approved and rejected', async () => {
    await renderPanel();
    expect(await screen.findByRole('tab', { name: /pending \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /approved \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /rejected \(1\)/i })).toBeInTheDocument();
  });

  it('shows the pending application by default and switches on tab click', async () => {
    const user = userEvent.setup();
    await renderPanel();

    expect(await screen.findByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.queryByText('Mia Cruz')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /approved/i }));
    expect(await screen.findByText('Mia Cruz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
  });
});

describe('review detail', () => {
  it('opens the detail modal and shows the six labeled answers', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole('button', { name: /review/i }));

    expect(gradService.getApplication).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Year Graduated')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('Degree Program')).toBeInTheDocument();
    expect(screen.getByText('Contact Email')).toBeInTheDocument();
    expect(screen.getByText('Contact Number')).toBeInTheDocument();
    expect(screen.getByText('Current Employer')).toBeInTheDocument();
    expect(screen.getByText('Purpose of Application')).toBeInTheDocument();
  });

  it('has no approve/reject action for an already-decided application', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(screen.getByRole('tab', { name: /approved/i }));
    await user.click(await screen.findByRole('button', { name: /review/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Mia Cruz')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
  });
});

/** The confirm dialog and the review modal's own footer share a button label
 * ("Approve"/"Reject") while both are open — scope to the confirm dialog by
 * its title so the two don't get confused. */
const findConfirmDialog = async (titleText) => {
  const dialogs = await screen.findAllByRole('dialog');
  const match = dialogs.find((d) => within(d).queryByText(titleText));
  if (!match) throw new Error(`No dialog titled "${titleText}" found`);
  return match;
};

describe('approve / reject', () => {
  it('approves without requiring notes', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole('button', { name: /review/i }));
    await user.click(await screen.findByRole('button', { name: /^approve$/i }));

    const confirmDialog = await findConfirmDialog('Approve Application');
    await user.click(within(confirmDialog).getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(gradService.reviewApplication).toHaveBeenCalledWith(1, 'approved', null));
  });

  it('disables reject until a note is entered, then sends it', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole('button', { name: /review/i }));
    expect(await screen.findByRole('button', { name: /^reject$/i })).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/add notes/i), 'Incomplete records.');
    expect(screen.getByRole('button', { name: /^reject$/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    const confirmDialog = await findConfirmDialog('Reject Application');
    await user.click(within(confirmDialog).getByRole('button', { name: /^reject$/i }));

    await waitFor(() =>
      expect(gradService.reviewApplication).toHaveBeenCalledWith(1, 'rejected', 'Incomplete records.')
    );
  });

  it('refreshes the queue after a decision', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole('button', { name: /review/i }));
    await user.click(await screen.findByRole('button', { name: /^approve$/i }));

    const confirmDialog = await findConfirmDialog('Approve Application');
    await user.click(within(confirmDialog).getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(gradService.getApplications).toHaveBeenCalledTimes(2));
  });
});
