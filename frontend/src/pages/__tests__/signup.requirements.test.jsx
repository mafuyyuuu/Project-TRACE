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
async function academic() {
  await screen.findByRole('option', { name: 'College of Computer Studies' });
  fireEvent.change(screen.getByLabelText('College *'), { target:{value:'College of Computer Studies'} });
  fireEvent.change(screen.getByLabelText('Program/Course *'), { target:{value:programs[0].name} });
  fireEvent.change(screen.getByLabelText(/^(Student|Alumni) ID/), { target:{value:'SYN-0001'} });
  const type=screen.queryByLabelText('Type of Student *');
  if(type)fireEvent.change(type,{target:{value:'irregular'}});
}
const next=async()=>{ await userEvent.click(screen.getByRole('button',{name:'Continue'})); };
async function personal() {
  for(const [label,value] of [['First Name *','Synthetic'],['Last Name *','Student'],['Email Address *','synthetic@example.test'],['Phone Number *','09123456789']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
}
async function account() {
  for(const placeholder of ['Create a password','Confirm your password'])fireEvent.change(screen.getByPlaceholderText(placeholder),{target:{value:'Trace_2026'}});
  await userEvent.upload(screen.getByLabelText('Proof of ID',{selector:'input'}),new File(['synthetic'],'proof.png',{type:'image/png'}));
}
async function fillDraft() { await academic();await next();await personal();await next();await account(); }

it('limits the managed program catalog by college and clears a mismatched choice',async()=>{
 start();expect(screen.getByLabelText('Program/Course *')).toBeDisabled();await academic();
 expect(screen.queryByRole('option',{name:programs[2].name})).not.toBeInTheDocument();
 await userEvent.selectOptions(screen.getByLabelText('College *'),'College of Education');
 expect(screen.getByLabelText('Program/Course *')).toHaveValue('');
 expect(screen.queryByRole('option',{name:programs[0].name})).not.toBeInTheDocument();
 expect(screen.getByRole('option',{name:programs[2].name})).toBeInTheDocument();
});
it('requires a declared student type and validates only the current step beside its fields',async()=>{
 const {container}=start();await screen.findByRole('option',{name:'College of Computer Studies'});await next();
 for(const label of ['Type of Student *','College *','Student ID *','Program/Course *'])expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid','true');
 expect(screen.queryByLabelText('Email Address *')).not.toBeInTheDocument();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(container.querySelector('form')).toHaveAttribute('novalidate');
 await academic();await next();expect(screen.getByRole('heading',{name:'Personal information'})).toBeInTheDocument();
 await next();expect(screen.getByLabelText('First Name *')).toHaveAttribute('aria-invalid','true');expect(register).not.toHaveBeenCalled();
});
it('retains identity, password and files when moving back and forward through all three steps',async()=>{
 start();await fillDraft();await userEvent.click(screen.getByRole('button',{name:'Back'}));
 expect(screen.getByLabelText('Full Name')).toHaveValue('Synthetic Student');await userEvent.click(screen.getByRole('button',{name:'Back'}));
 expect(screen.getByLabelText('Student ID *')).toHaveValue('SYN-0001');expect(screen.getByLabelText('Type of Student *')).toHaveValue('irregular');
 await next();await next();expect(screen.getByPlaceholderText('Create a password')).toHaveValue('Trace_2026');expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();
});
it('requires unchecked privacy acknowledgment, preserves the draft through its notice and submits only on confirmation',async()=>{
 start();await fillDraft();const ack=screen.getByRole('checkbox',{name:/I have read and acknowledge/});expect(ack).not.toBeChecked();
 await userEvent.click(screen.getByRole('button',{name:'Create Account'}));expect(ack).toHaveAttribute('aria-invalid','true');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Read Privacy Notice'}));const notice=screen.getByRole('dialog',{name:'Registration Privacy Notice'});expect(notice).toHaveTextContent(PRIVACY_NOTICE_VERSION);expect(notice).toHaveTextContent('OCR');
 await userEvent.click(within(notice).getByRole('button',{name:'Close Notice'}));expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();expect(ack).not.toBeChecked();
 await userEvent.click(ack);await userEvent.click(screen.getByRole('button',{name:'Create Account'}));const review=screen.getByRole('dialog',{name:'Confirm Registration'});
 expect(review).toHaveTextContent('Irregular');expect(review).toHaveTextContent('Acknowledged · '+PRIVACY_NOTICE_VERSION);expect(register).not.toHaveBeenCalled();
 await userEvent.click(within(review).getByRole('button',{name:'Submit Registration'}));await waitFor(()=>expect(register).toHaveBeenCalledOnce());
 const body=register.mock.calls[0][0];expect(body.get('study_load')).toBe('irregular');expect(body.get('program')).toBe(programs[0].name);expect(body.get('privacy_acknowledged')).toBe('true');expect(body.get('privacy_notice_version')).toBe(PRIVACY_NOTICE_VERSION);
 expect(await screen.findByRole('heading',{name:'Registration complete'})).toBeInTheDocument();
});
it('retries a failed catalog without losing the academic draft',async()=>{
 getPrograms.mockRejectedValueOnce(new Error('offline'));start();fireEvent.change(screen.getByLabelText('Student ID *'),{target:{value:'SYN-0001'}});
 await userEvent.click(await screen.findByRole('button',{name:'Retry Catalog'}));await screen.findByRole('option',{name:'College of Computer Studies'});
 expect(screen.getByLabelText('College *')).toBeEnabled();expect(screen.getByLabelText('Student ID *')).toHaveValue('SYN-0001');expect(getPrograms).toHaveBeenCalledTimes(2);
});
it('shows an actionable empty catalog rather than allowing an unmanaged program',async()=>{
 getPrograms.mockResolvedValue({programs:[]});start();await screen.findByRole('option',{name:'College of Computer Studies'});await userEvent.selectOptions(screen.getByLabelText('College *'),'College of Computer Studies');expect(screen.getByLabelText('Program/Course *')).toBeDisabled();expect(screen.getByText(/No active programs/)).toBeInTheDocument();
});
it('rejects incompatible and oversized replacements without discarding valid proof or blanking the form',async()=>{
 const {container}=start();await fillDraft();expect(screen.getByText(/Accepted files: JPG, JPEG, PNG or PDF. Maximum size: 10 MB/)).toBeInTheDocument();
 const picker=screen.getByLabelText('Proof of ID',{selector:'input'});expect(picker).toHaveAttribute('accept','.pdf,.png,.jpg,.jpeg');const user=userEvent.setup({applyAccept:false});
 await user.upload(picker,new File(['synthetic'],'proof.docx',{type:'application/octet-stream'}));expect(screen.getByRole('alert')).toHaveTextContent('supported image or PDF');
 await user.upload(picker,new File([new Uint8Array(10*1024*1024+1)],'large.pdf',{type:'application/pdf'}));expect(screen.getByRole('alert')).toHaveTextContent('limit');expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();expect(container.querySelector('form')).toBeInTheDocument();
});
it('marks invalid email, weak password and mismatched confirmation on their owning step',async()=>{
 start();await academic();await next();await personal();fireEvent.change(screen.getByLabelText('Email Address *'),{target:{value:'invalid-email'}});await next();expect(screen.getByLabelText('Email Address *')).toHaveAttribute('aria-invalid','true');
 fireEvent.change(screen.getByLabelText('Email Address *'),{target:{value:'synthetic@example.test'}});await next();await account();fireEvent.change(screen.getByLabelText('Password *'),{target:{value:'weak'}});
 await userEvent.click(screen.getByRole('button',{name:'Create Account'}));expect(screen.getByLabelText('Password *')).toHaveAttribute('aria-invalid','true');expect(screen.getByLabelText('Confirm Password *')).toHaveAttribute('aria-invalid','true');expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();expect(register).not.toHaveBeenCalled();
});
it.each([['This ID is already registered.','Student ID *',2],['Enter a valid email address.','Email Address *',1]])('returns server rejection to its step without losing proof (%s)',async(message,label,advances)=>{
 register.mockRejectedValueOnce({response:{data:{error:message}}});start();await fillDraft();await userEvent.click(screen.getByRole('checkbox',{name:/I have read and acknowledge/}));await userEvent.click(screen.getByRole('button',{name:'Create Account'}));await userEvent.click(screen.getByRole('button',{name:'Submit Registration'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid','true');expect(screen.getByText(message)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText(label),{target:{value:label==='Student ID *'?'SYN-0002':'other@example.test'}});for(let i=0;i<advances;i++)await next();expect(screen.getByText(/Selected: proof.png/)).toBeInTheDocument();
});
it('keeps an uncertain server result beside Create Account without inviting a silent duplicate submission',async()=>{
 register.mockRejectedValueOnce({code:'ECONNABORTED'});start();await fillDraft();await userEvent.click(screen.getByRole('checkbox',{name:/I have read and acknowledge/}));await userEvent.click(screen.getByRole('button',{name:'Create Account'}));await userEvent.click(screen.getByRole('button',{name:'Submit Registration'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Your account may already be saved.');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Create Account'})).toBeEnabled();
});
it('accepts alumni years beginning in 1999 without requiring current-student status',async()=>{
 start();await userEvent.click(screen.getByRole('button',{name:'Alumni'}));await academic();expect(screen.queryByLabelText('Type of Student *')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText(/Year Started/,{selector:'input'}),{target:{value:'1999'}});fireEvent.change(screen.getByLabelText(/Year Graduated/,{selector:'input'}),{target:{value:'2003'}});await next();await personal();await next();await account();await userEvent.click(screen.getByRole('checkbox',{name:/I have read and acknowledge/}));await userEvent.click(screen.getByRole('button',{name:'Create Account'}));await userEvent.click(screen.getByRole('button',{name:'Submit Registration'}));
 await waitFor(()=>expect(register).toHaveBeenCalledOnce());expect(register.mock.calls[0][0].get('year_started')).toBe('1999');expect(register.mock.calls[0][0].get('study_load')).toBeNull();
});
