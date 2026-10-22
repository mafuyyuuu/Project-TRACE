import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountDirectory from '@/features/admin/components/AccountDirectory';
import AdminManual from '@/features/admin/components/AdminManual';
import AdminTemplatesPanel from '@/features/admin/components/AdminTemplatesPanel';
import AdminAuditLog from '@/features/admin/components/AdminAuditLog';
import { saveTemplate } from '@/services/templateService';

vi.mock('@/components/UserAvatar', () => ({ default: () => <span aria-hidden="true">Avatar</span> }));
vi.mock('@/services/templateService', () => ({
  getTemplates: vi.fn().mockResolvedValue({ data: [{ template_key: 'payment_slip', name: 'Payment slip' }] }),
  getTemplate: vi.fn().mockResolvedValue({ data: { content: 'Hello reader', font_family: 'sans-serif', font_size: '12px' } }),
  saveTemplate: vi.fn().mockResolvedValue({}),
}));

describe('Admin Figma UI interactions', () => {
  it('paginates loaded audit records and combines search, role and event filters', async () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({ full_name: `Account ${i}`, student_id: `TEST-${i}`, event_type: i === 9 ? 'LOGIN_FAILED' : 'LOGIN_SUCCESS', role: i === 9 ? 'student' : 'admin', created_at: '2026-10-14T00:00:00Z', ip_address: `192.0.2.${i}` }));
    render(<AdminAuditLog security logs={logs} />);
    expect(screen.queryByText('Account 9')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Account 9')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Security event filters' }), 'failed');
    expect(screen.getByText('Account 9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Log role' }), 'admin');
    expect(screen.getByText('No security logs found')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Log role' }), 'all');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search security logs' }), '192.0.2.9');
    expect(screen.getByText('Account 9')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Security event filters' }), 'all');
    expect(screen.getByText('Account 0')).toBeInTheDocument();
  });
  it('requests saved helpfulness without changing the supplied answers', async () => {
    const question='What do the dashboard insights mean?',choose=vi.fn();
    const reviews={selected:{},feedback:{},drafts:{},pending:{},errors:{},notices:{},choose,view:vi.fn(),setDraft:vi.fn(),saveSuggestion:vi.fn()};
    const {rerender}=render(<AdminManual reviews={reviews} entries={[[question,'Recorded metrics only.']]}/>);
    await userEvent.click(screen.getByRole('button',{name:'Yes'}));expect(choose).toHaveBeenCalledWith(question,'helpful');
    rerender(<AdminManual reviews={{...reviews,feedback:{[question]:{action:'helpful'}}}} entries={[[question,'Recorded metrics only.']]}/>);
    expect(screen.getByRole('button',{name:'Yes'})).toHaveAttribute('aria-pressed','true');
    expect(screen.getByText('Recorded metrics only.')).toBeInTheDocument();
  });

  it('paginates the full directory and opens the correct account by keyboard', async () => {
    const accounts = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, full_name: `Account ${index + 1}`, student_id: `TEST-${index + 1}`, role: 'student', is_active: 1 }));
    const select = vi.fn();
    render(<AccountDirectory users={accounts} onSelectUser={select} roleFilter="All" onRoleFilterChange={vi.fn()} roleOptions={[{ value: 'All', label: 'All Roles' }]} />);
    expect(within(screen.getByRole('table')).queryByText('Account 12')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    const account = screen.getByRole('button', { name: /Account 12/ });
    account.focus();
    await userEvent.keyboard('{Enter}');
    expect(select).toHaveBeenCalledExactlyOnceWith(accounts[11]);
  });

  it('searches manual answers and reports no results without dropping retained guidance', async () => {
    render(<AdminManual entries={[["How do I export records?", 'Use the applied filter snapshot.'], ['Where do I manage accounts?', 'Open System Maintenance.']]} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search the manual' }), 'snapshot');
    expect(screen.getByText('How do I export records?')).toBeInTheDocument();
    expect(screen.queryByText('Where do I manage accounts?')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    expect(screen.getByText('Where do I manage accounts?')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox'), 'no matching entry');
    expect(screen.getByRole('status')).toHaveTextContent('No manual entries match');
  });

  it('inserts a variable at the selected cursor range and keeps reset local until a confirmed save', async () => {
    render(<AdminTemplatesPanel />);
    const editor = await screen.findByDisplayValue('Hello reader');
    editor.focus(); editor.setSelectionRange(6, 12);
    await userEvent.click(screen.getByRole('button', { name: '{{STUDENT_NAME}}', exact: true }));
    expect(editor).toHaveValue('Hello {{STUDENT_NAME}}');
    expect(saveTemplate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(editor).toHaveValue('');
    expect(saveTemplate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
    expect(saveTemplate).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Confirm Template Save' })).getByRole('button', { name: 'Save Template' }));
    expect(saveTemplate).toHaveBeenCalledExactlyOnceWith('payment_slip', { content: '', font_family: 'sans-serif', font_size: '12px' });
  });

  it('rejects variable insertion beyond the input limit without truncating the draft', async () => {
    render(<AdminTemplatesPanel />);
    const editor = await screen.findByDisplayValue('Hello reader');
    const content = 'a'.repeat(100000);
    fireEvent.change(editor, { target: { value: content } });
    editor.setSelectionRange(0, 0);
    await userEvent.click(screen.getByRole('button', { name: '{{STUDENT_NAME}}', exact: true }));
    expect(editor).toHaveValue(content);
    expect(screen.getByRole('alert')).toHaveTextContent('100,000-character template limit');
    editor.setSelectionRange(0, 16);
    await userEvent.click(screen.getByRole('button', { name: '{{STUDENT_NAME}}', exact: true }));
    expect(editor.value).toBe('{{STUDENT_NAME}}' + content.slice(16));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
