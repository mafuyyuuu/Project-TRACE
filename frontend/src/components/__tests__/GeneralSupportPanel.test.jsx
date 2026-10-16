import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FloatingSupportChat from '@/features/student/components/FloatingSupportChat';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import * as api from '@/services/supportTicketsService';
import { getMessageThreads } from '@/services/documentMessagesService';
vi.mock('@/services/supportTicketsService', () => ({getTickets:vi.fn(),getTicket:vi.fn(),getSupportSettings:vi.fn(),getSupportFaq:vi.fn(),createTicket:vi.fn(),sendTicketMessage:vi.fn(),ticketAction:vi.fn(),ticketFaq:vi.fn(),claimSupportTicket:vi.fn(),setSupportAvailability:vi.fn(),saveSupportSettings:vi.fn()}));
vi.mock('@/services/documentMessagesService', () => ({getMessageThreads:vi.fn()}));
vi.mock('@/components/RequestAttachments',()=>({default:({documentId})=><div aria-label="Synthetic linked attachments">Authorized case {documentId}</div>}));
vi.mock('@/services/realtimeService', () => ({onNotification:vi.fn(() => () => {})}));
const student = {id:3,role:'student',full_name:'Synthetic student'};
const desk = {id:7,role:'clerk',desk_assignment:'Window 1'};
const ticket = {id:11,subject:'Synthetic help',state:'FAQ_ASSISTANCE',student_user_id:3,category:'general',read_only:false};
const settings = {weekdays:[1,2,3,4],open_minute:480,close_minute:960,closed_dates:[],warning_minutes:3,timeout_minutes:5};
const read = (changes = {}) => ({ticket:{...ticket,...changes},messages:[],next_cursor:null,window:{open:true},queue:{position:1,available_clerks:0,message:'Waiting for available staff'}});
it.each(['IN_PROGRESS','RESOLVED'])('keeps Admin operational support read-only in %s even with old API flags',async state => {
 api.getTicket.mockResolvedValue(read({state,read_only:false}));
 render(<RequestMessagesPanel user={{id:9,role:'admin'}} />);await screen.findByText(/Operational support is read-only/);
 expect(screen.queryByRole('button',{name:'New linked ticket'})).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
 for(const name of ['Reopen ticket','Resolve ticket','Request student reply','Awaiting student']) expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
});
it('follows a student ticket notification on the mounted panel while retaining a new-ticket form draft',async()=>{
  const {rerender}=render(<RequestMessagesPanel user={student}/>);
  await waitFor(()=>expect(api.getTicket).toHaveBeenCalledWith('11',null,expect.any(AbortSignal)));
  fireEvent.click(screen.getByRole('button',{name:'New ticket'}));
  const input=screen.getByLabelText('Subject');fireEvent.change(input,{target:{value:'Retain this form draft'}});
  api.getTicket.mockResolvedValue({...read(),ticket:{...ticket,id:18,subject:'New notification ticket'}});
  window.history.replaceState(null,'','/dashboard?tab=messages&ticket=18');
  rerender(<RequestMessagesPanel user={student}/>);
  await waitFor(()=>expect(api.getTicket).toHaveBeenCalledWith('18',null,expect.any(AbortSignal)));
  expect(screen.getByLabelText('Subject')).toBe(input);
  expect(input).toHaveValue('Retain this form draft');
});
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
 expect(api.getTickets).toHaveBeenCalledWith(11,expect.any(AbortSignal),'active');
 expect(api.getTicket).toHaveBeenCalledWith('11',80,expect.any(AbortSignal));
 expect(screen.queryByRole('button',{name:/^(Previous|Next)$/})).not.toBeInTheDocument();
});
it('confirms availability before saving and announces success outside the queue', async () => {
  render(<RequestMessagesPanel user={desk} />);
  const availability = await screen.findByRole('switch',{name:'Live support availability'});
  expect(availability).toHaveAttribute('aria-checked','false');
  expect(screen.getByRole('button',{name:'Claim oldest ticket'})).toBeDisabled();
  api.setSupportAvailability.mockResolvedValue({available:true});
  api.getSupportSettings.mockResolvedValue({settings,can_manage:false,available:true});
  fireEvent.click(availability);
  expect(api.setSupportAvailability).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  const notification = await screen.findByRole('complementary',{name:'Support action notifications'});
  expect(notification).toHaveTextContent('Live support availability: Available.');
  expect(notification.closest('[aria-label="Support workspace"]')).toBeNull();
  expect(screen.queryByText('Support action saved.')).not.toBeInTheDocument();
  expect(availability).toHaveAttribute('aria-checked','true');
  fireEvent.click(screen.getByRole('button',{name:'Dismiss Live support availability: Available.'}));
  expect(screen.queryByRole('complementary',{name:'Support action notifications'})).not.toBeInTheDocument();
});
it('keeps a failed availability action in its confirmation without a success toast', async () => {
  render(<RequestMessagesPanel user={desk} />);
  api.setSupportAvailability.mockRejectedValue({response:{data:{error:'Synthetic save failed'}}});
  fireEvent.click(await screen.findByRole('switch',{name:'Live support availability'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  expect(await screen.findByRole('dialog',{name:'Confirm Support Action'})).toHaveTextContent('Synthetic save failed');
  expect(screen.queryByRole('complementary',{name:'Support action notifications'})).not.toBeInTheDocument();
});
it('searches only loaded authorized ticket metadata without another server request', async () => {
  api.getTickets.mockResolvedValue({tickets:[ticket,{...ticket,id:12,subject:'Receipt question',student_name:'Synthetic Alvarez',tracking_number:'SYN-RECEIPT'}],next_cursor:11});
  render(<RequestMessagesPanel user={student} />);
  await screen.findByRole('button',{name:/Receipt question/});
  const calls=api.getTickets.mock.calls.length;
  fireEvent.change(screen.getByRole('searchbox',{name:'Search loaded tickets'}),{target:{value:'Alvarez'}});
  expect(screen.getByRole('button',{name:/Receipt question/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/#11 Synthetic help/})).not.toBeInTheDocument();
  expect(api.getTickets).toHaveBeenCalledTimes(calls);
  expect(screen.getByRole('button',{name:'Load older tickets'})).toBeInTheDocument();
});
it('keeps the widget message and file drafts across Escape and reopen, restoring launcher focus', async () => {
  render(<FloatingSupportChat user={student} />);
  const launcher=screen.getByRole('button',{name:'Open registrar support'}); launcher.focus();fireEvent.click(launcher);
  const input=await screen.findByLabelText('Message');fireEvent.change(input,{target:{value:'Keep this draft'}});
  fireEvent.change(screen.getByLabelText('Attach chat files'),{target:{files:[new File(['synthetic'],'retained.pdf',{type:'application/pdf'})]}});
  fireEvent.keyDown(document,{key:'Escape'});
  expect(screen.queryByRole('region',{name:'Window 1 support'})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Open registrar support'})).toHaveFocus();
  fireEvent.click(screen.getByRole('button',{name:'Open registrar support'}));
  expect(await screen.findByLabelText('Message')).toHaveValue('Keep this draft');
  expect(screen.getByRole('button',{name:'Remove retained.pdf'})).toBeInTheDocument();
  expect(api.sendTicketMessage).not.toHaveBeenCalled();
});
it('lets a ticket confirmation consume Escape before closing the compact widget', async () => {
  render(<FloatingSupportChat user={student} />);fireEvent.click(screen.getByRole('button',{name:'Open registrar support'}));
  fireEvent.click(await screen.findByRole('button',{name:'Talk to staff'}));
  fireEvent.keyDown(document,{key:'Escape'});
  expect(screen.queryByRole('dialog',{name:'Confirm Support Action'})).not.toBeInTheDocument();
  expect(screen.getByRole('region',{name:'Window 1 support'})).toBeInTheDocument();
  expect(api.ticketAction).not.toHaveBeenCalled();
});
it('keeps ticket timestamps and date separators real and separates queue notices from context', async () => {
  api.getTicket.mockResolvedValue({...read({state:'QUEUED'}),messages:[{id:1,sender_id:3,message:'Synthetic dated message',created_at:'2026-10-10T17:10:00Z'}],window:{open:false,next_opens_at:'2026-10-12T00:00:00Z'}});
  render(<RequestMessagesPanel user={student} />);
  expect(await screen.findByText('October 11, 2026 · Manila')).toBeInTheDocument();
  expect(screen.getByRole('complementary',{name:'Support hours and queue'})).toHaveTextContent('Next opening');
  expect(screen.getByLabelText('Ticket context and actions')).not.toHaveTextContent('Next opening');
  expect(screen.queryByText('Sent')).not.toBeInTheDocument();
});

it('opens the selected linked case context without creating another ticket', async () => {
 api.getTicket.mockResolvedValue(read({category:'linked',document_id:42,tracking_number:'SYN-42',document_type:'Diploma'}));
 render(<RequestMessagesPanel user={student} />);
 fireEvent.click(await screen.findByRole('button',{name:'Open linked case'}));
 expect(await screen.findByRole('dialog',{name:'Linked request'})).toHaveTextContent('SYN-42');
 expect(screen.getByLabelText('Synthetic linked attachments')).toHaveTextContent('Authorized case 42');
 expect(api.createTicket).not.toHaveBeenCalled();
});
it('stacks consecutive successful actions and dismisses them on navigation', async () => {
 render(<RequestMessagesPanel user={desk} />);
 const availability=await screen.findByRole('switch',{name:'Live support availability'});
 api.setSupportAvailability.mockResolvedValue({available:true});
 api.getSupportSettings.mockResolvedValue({settings,can_manage:false,available:true});
 fireEvent.click(availability);fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
 await screen.findByRole('button',{name:'Dismiss Live support availability: Available.'});
 api.getSupportSettings.mockResolvedValue({settings,can_manage:false,available:false});
 fireEvent.click(availability);fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
 expect(await screen.findByRole('button',{name:'Dismiss Live support availability: Unavailable.'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Dismiss Live support availability: Available.'})).toBeInTheDocument();
 fireEvent(window,new Event('trace:notification-navigation'));
 expect(screen.queryByRole('complementary',{name:'Support action notifications'})).not.toBeInTheDocument();
});

it('filters Window 1 loaded tickets by queued state without clearing search or loading older pages', async () => {
  window.history.replaceState(null, '', '/dashboard?tab=messages');
  api.getTickets.mockResolvedValue({tickets:[{...ticket,state:'QUEUED',subject:'Synthetic queued'},{...ticket,id:12,state:'RESOLVED',subject:'Synthetic resolved'}],next_cursor:11});
  render(<RequestMessagesPanel user={desk}/>);
  await screen.findByRole('button',{name:/Synthetic queued/});
  expect(screen.getByRole('button',{name:/Synthetic resolved/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Queued',exact:true}));
  expect(screen.queryByRole('button',{name:/Synthetic resolved/})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Synthetic queued/})).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Search loaded tickets'}),{target:{value:'resolved'}});
  expect(screen.getByText('No loaded tickets match your search.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'All',exact:true}));
  expect(screen.getByRole('button',{name:/Synthetic resolved/})).toBeInTheDocument();
  expect(screen.getByRole('searchbox',{name:'Search loaded tickets'})).toHaveValue('resolved');
  expect(screen.getByRole('button',{name:'Load older tickets'})).toBeInTheDocument();
  expect(api.createTicket).not.toHaveBeenCalled();
});

it('automatically shows resolved support history in Archive and moves a reopened ticket back to Active', async()=>{
  api.getTicket.mockResolvedValue(read({state:'IN_PROGRESS',assigned_to:desk.id}));
  api.ticketAction.mockResolvedValue({id:ticket.id,state:'RESOLVED'});
  render(<RequestMessagesPanel user={desk}/>);
  await screen.findByRole('button',{name:'Resolve ticket'});
  fireEvent.click(screen.getByRole('button',{name:'Resolve ticket'}));
  api.getTicket.mockResolvedValue(read({state:'RESOLVED',read_only:true}));
  api.getTickets.mockResolvedValue({tickets:[{...ticket,state:'RESOLVED'}],next_cursor:null});
  fireEvent.click(screen.getByRole('button',{name:'Confirm',exact:true}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Archive',exact:true})).toHaveAttribute('aria-pressed','true'));
  expect(await screen.findByText('Read-only history — ticket resolved.')).toBeInTheDocument();
  expect(screen.queryByRole('textbox',{name:'Message'})).not.toBeInTheDocument();
  expect(api.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'archive');
  fireEvent.click(screen.getByRole('button',{name:'Reopen ticket'}));
  api.getTicket.mockResolvedValue(read({state:'QUEUED',read_only:false}));
  api.getTickets.mockResolvedValue({tickets:[{...ticket,state:'QUEUED'}],next_cursor:null});
  fireEvent.click(screen.getByRole('button',{name:'Confirm',exact:true}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Active',exact:true})).toHaveAttribute('aria-pressed','true'));
  expect(api.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'active');
});

it.each([student,{id:1,role:'admin'},desk,{...desk,desk_assignment:'Receiving Desk'},{...desk,desk_assignment:'Finance'},{...desk,desk_assignment:'Secretary'}])('keeps analytics out of Support for $role/$desk_assignment',async user=>{
  render(<RequestMessagesPanel user={user}/>);
  await waitFor(()=>expect(api.getSupportSettings).toHaveBeenCalled());
  expect(screen.queryByRole('button',{name:/Support analytics/i})).not.toBeInTheDocument();
  expect(screen.queryByText('More support actions')).not.toBeInTheDocument();
});
