import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualInputModal from '@/features/window1/components/ManualInputModal';
import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
import NewRequestModal from '@/features/student/components/NewRequestModal';

describe('Window 1 form actions after footer migration', () => {
  it('keeps native required validation and submits the associated manual form with the keyboard', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((e) => e.preventDefault());
    render(<ManualInputModal open onClose={vi.fn()} handleManualInputSubmit={submit}
      handleFetchStudent={vi.fn()} actionLoading={false} />);
    const button = screen.getByRole('button', { name: 'Submit Request' });
    await user.click(button);
    expect(submit).not.toHaveBeenCalled();
    await user.type(screen.getByPlaceholderText('e.g. 23-23922'), 'STU-001');
    await user.type(screen.getByPlaceholderText('Last Name, First Name'), 'Reyes, Ana');
    await user.selectOptions(document.getElementById('manual-course'), 'BSCS');
    await user.selectOptions(document.querySelector('select[name="docType"]'), 'Transcript of Records');
    await user.selectOptions(document.querySelector('select[name="purpose"]'), 'Employment Requirements');
    button.focus();
    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledOnce();
    expect(submit.mock.calls[0][0].target).toBe(button.form);
    expect(button.form.elements.studentId.value).toBe('STU-001');
    expect(button.form.elements.fullName.value).toBe('Reyes, Ana');
  });

  it.each(['Transcript of Records', 'Honorable Dismissal'])('provides correction notes for %s', (documentType) => {
    const setNotes = vi.fn();
    const action = vi.fn();
    render(<IntakeReviewModal selectedDoc={{ id: 1, document_type: documentType, amount: 100 }}
      setActiveModal={vi.fn()} setViewImageUrl={vi.fn()} handleIntake={action} actionLoading={false}
      intakeNotes="" setIntakeNotes={setNotes} intakeFile={null} setIntakeFile={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Notes/ }), { target: { value: 'Please correct your name.' } });
    expect(setNotes).toHaveBeenCalledWith('Please correct your name.');
    fireEvent.click(screen.getByRole('button', { name: 'Return to Student' }));
    expect(action).toHaveBeenCalledWith('return');
  });
});

describe('Student request fields', () => {
  it.each([false, true])('renders purpose and applies the configured attachment requirement (%s)', (requiresAttachment) => {
    const { container } = render(<NewRequestModal user={{ user_type: 'student' }} setActiveModal={vi.fn()}
      documentTypes={[{ id: 1, name: 'Certification', available_to: 'both', requires_attachment: requiresAttachment,
        attachment_label: 'Student ID', base_fee: 50 }]}
      documentTypesLoading={false} selections={{ Certification: { copies: 1, semesters: 8, purpose: 'Employment' } }}
      toggleDocumentType={vi.fn()} updateSelection={vi.fn()} handleStudentSubmitRequest={vi.fn()} actionLoading={false} />);
    expect(screen.getByDisplayValue('Employment')).toBeInTheDocument();
    expect(screen.getByText('Purpose')).toBeInTheDocument();
    expect(document.querySelectorAll('input[type=file]')).toHaveLength(requiresAttachment ? 1 : 0);
    expect(screen.getByRole('button', { name: 'Next' }).form).toHaveAttribute('id', 'new-request-form');
    expect(container).toBeEmptyDOMElement();
  });
});
