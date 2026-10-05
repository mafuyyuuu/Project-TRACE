import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FloatingSupportChat from '@/features/student/components/FloatingSupportChat';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import * as api from '@/services/supportTicketsService';
import { getMessageThreads } from '@/services/documentMessagesService';
vi.mock('@/services/supportTicketsService', () => ({getTickets:vi.fn(),getTicket:vi.fn(),getSupportSettings:vi.fn(),getSupportFaq:vi.fn(),createTicket:vi.fn(),sendTicketMessage:vi.fn(),ticketAction:vi.fn(),ticketFaq:vi.fn(),claimSupportTicket:vi.fn(),setSupportAvailability:vi.fn(),saveSupportSettings:vi.fn()}));
vi.mock('@/services/documentMessagesService', () => ({getMessageThreads:vi.fn()}));
vi.mock('@/services/realtimeService', () => ({onNotification:vi.fn(() => () => {})}));
const student = {id:3,role:'student',full_name:'Synthetic student'};
const desk = {id:7,role:'clerk',desk_assignment:'Window 1'};
const ticket = {id:11,subject:'Synthetic help',state:'FAQ_ASSISTANCE',student_user_id:3,category:'general',read_only:false};
const settings = {weekdays:[1,2,3,4],open_minute:480,close_minute:960,closed_dates:[],warning_minutes:3,timeout_minutes:5};
const read = (changes = {}) => ({ticket:{...ticket,...changes},messages:[],next_cursor:null,window:{open:true},queue:{position:1,available_clerks:0,message:'Waiting for available staff'}});
beforeEach(() => {
  vi.clearAllMocks(); Element.prototype.scrollIntoView=vi.fn();
  window.history.replaceState(null,'','/dashboard?tab=messages&ticket=11');
  api.getTickets.mockResolvedValue({tickets:[ticket],next_cursor:null}); api.getTicket.mockResolvedValue(read());
  api.getSupportSettings.mockResolvedValue({settings,can_manage:false,available:false});
  api.getSupportFaq.mockResolvedValue([{id:'email',question:'How do I verify email?',answer:'Use the Profile Verify button.'}]);
  getMessageThreads.mockResolvedValue({threads:[],total:0});
});
it('opens one ticket workspace and FAQ-first conversation from the floating bubble', async () => {
  render(<FloatingSupportChat user={student} />); fireEvent.click(screen.getByRole('button',{name:'Open registrar support'}));
  expect(await screen.findByRole('heading',{name:'Approved FAQ assistance'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Talk to staff'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'General support'})).not.toBeInTheDocument();
  expect(screen.getByRole('region',{name:'Selected support ticket'})).toBeInTheDocument();
});
it('keeps a failed draft, synchronously blocks duplicate sends and reuses the retry key', async () => {
  render(<RequestMessagesPanel user={student} />); await screen.findByLabelText('Message');
  let fail; api.sendTicketMessage.mockReturnValueOnce(new Promise((_resolve,reject) => {fail=reject;}));
  fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Help please'}});
  const send=screen.getByRole('button',{name:'Send'}); fireEvent.click(send); fireEvent.click(send);
  expect(api.sendTicketMessage).toHaveBeenCalledOnce(); expect(send).toBeDisabled();
  await act(async () => fail(new Error('unavailable')));
  expect(screen.getByLabelText('Message')).toHaveValue('Help please');
  expect(screen.getByRole('alert')).toHaveTextContent('Could not confirm saving');
  const firstKey=api.sendTicketMessage.mock.calls[0][3];
  api.sendTicketMessage.mockResolvedValue({sent:{id:30,sender_id:3,message:'Help please',created_at:'2026-10-06T02:00:00Z'}});
  fireEvent.click(send); await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue(''));
  expect(api.sendTicketMessage.mock.calls[1][3]).toBe(firstKey);
});
it('does not restore a sent draft when the subsequent history refresh fails', async () => {
  render(<RequestMessagesPanel user={student} />); await screen.findByLabelText('Message');
  api.sendTicketMessage.mockResolvedValue({sent:{id:30,sender_id:3,message:'Accepted',created_at:'2026-10-06T02:00:00Z'}});
  api.getTicket.mockRejectedValue(new Error('read unavailable'));
  fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Accepted'}}); fireEvent.click(screen.getByRole('button',{name:'Send'}));
  await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue(''));
  expect(screen.getByText('Accepted')).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
});
it('makes closed-case history read-only and retains messages', async () => {
  api.getTicket.mockResolvedValue({...read({read_only:true,category:'linked',document_id:42,current_status:'COMPLETED'}),messages:[{id:1,kind:'message',sender_id:3,message:'Preserved history',created_at:'2026-10-06T02:00:00Z'}]});
  render(<RequestMessagesPanel user={student} />); expect(await screen.findByText('Preserved history')).toBeInTheDocument();
  expect(screen.queryByLabelText('Message')).not.toBeInTheDocument(); expect(screen.queryByRole('button',{name:'Attach files'})).not.toBeInTheDocument();
});
it('allows only the assigned Window 1 clerk to reply to a live ticket', async () => {
  api.getTicket.mockResolvedValue(read({state:'IN_PROGRESS',assigned_to:7}));
  api.getSupportSettings.mockResolvedValue({settings,can_manage:true,available:true});
  render(<RequestMessagesPanel user={desk} />); await screen.findByLabelText('Message');
  expect(screen.getByRole('button',{name:'Request student reply'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Claim oldest ticket'})).toBeInTheDocument();
});
it('keeps an unassigned clerk read-only until a claim succeeds', async () => {
  api.getTicket.mockResolvedValue(read({state:'IN_PROGRESS',assigned_to:9}));
  render(<RequestMessagesPanel user={desk} />); await screen.findByText(/Declare availability and claim/);
  expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Request student reply'})).not.toBeInTheDocument();
});
it('rejects a fourth chat file before sending', async () => {
  render(<RequestMessagesPanel user={student} />); await screen.findByLabelText('Message');
  const files=Array.from({length:4},(_,i) => new File(['synthetic'],`file${i}.png`,{type:'image/png'}));
  fireEvent.change(screen.getByLabelText('Attach chat files'),{target:{files}});
  expect(screen.getByRole('alert')).toHaveTextContent('up to 3'); expect(api.sendTicketMessage).not.toHaveBeenCalled();
});
it.each(['Finance','Secretary'])('does not expose general ticket creation to %s', async desk_assignment => {
  api.getTickets.mockResolvedValue({tickets:[],next_cursor:null});
  render(<RequestMessagesPanel user={{...desk,desk_assignment}} />); await screen.findByText('No tickets yet.');
  expect(screen.queryByRole('button',{name:'New ticket'})).not.toBeInTheDocument(); expect(getMessageThreads).toHaveBeenCalledWith(1);
});
it('keeps failed-send feedback through a successful background read',async()=>{
 render(<RequestMessagesPanel user={student} />);await screen.findByLabelText('Message');
 api.sendTicketMessage.mockRejectedValue(new Error('Synthetic unavailable'));
 fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Retained draft'}});fireEvent.click(screen.getByRole('button',{name:'Send'}));
 await screen.findByRole('alert');
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 expect(screen.getByRole('alert')).toHaveTextContent('Could not confirm saving');expect(screen.getByLabelText('Message')).toHaveValue('Retained draft');
});
it('reaches older capped ticket and message pages without Previous/Next controls or duplicate rows',async()=>{
 api.getTickets.mockResolvedValueOnce({tickets:[ticket],next_cursor:11}).mockResolvedValue({tickets:[{...ticket,id:4,subject:'Older synthetic ticket'}],next_cursor:null});
 const recent={id:80,kind:'message',sender_id:3,message:'Recent synthetic message',created_at:'2026-10-06T02:00:00Z'};
 const oldest={...recent,id:1,message:'Oldest synthetic message'};
 api.getTicket.mockResolvedValueOnce({...read(),messages:[recent],next_cursor:80}).mockResolvedValue({...read(),messages:[oldest],next_cursor:null});
 render(<RequestMessagesPanel user={student} />);
 fireEvent.click(await screen.findByRole('button',{name:'Load older tickets'}));
 expect(await screen.findByText(/Older synthetic ticket/)).toBeInTheDocument();
 fireEvent.click(await screen.findByRole('button',{name:'Load older messages'}));
 expect(await screen.findByText('Oldest synthetic message')).toBeInTheDocument();
 expect(screen.getAllByText('Recent synthetic message')).toHaveLength(1);
 expect(api.getTickets).toHaveBeenCalledWith(11,expect.any(AbortSignal));
 expect(api.getTicket).toHaveBeenCalledWith('11',80,expect.any(AbortSignal));
 expect(screen.queryByRole('button',{name:/^(Previous|Next)$/})).not.toBeInTheDocument();
});
