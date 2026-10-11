import {beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import InternalAssistanceWorkspace from '@/components/InternalAssistanceWorkspace';
import * as api from '@/services/internalAssistanceService';
import {navItemsForUser} from '@/utils/navigation';
vi.mock('@/services/internalAssistanceService',() => ({listTickets:vi.fn(),readTicket:vi.fn(),createTicket:vi.fn(),sendMessage:vi.fn(),changeTicket:vi.fn()}));
vi.mock('@/services/realtimeService',() => ({onNotification:vi.fn(() => () => {})}));
const staff = {id:4,role:'clerk',desk_assignment:'Finance'};
const admin = {id:9,role:'admin'};
const ticket = {id:11,created_by:4,creator_name:'Demo Cashier',creator_desk:'Finance',subject:'Print alignment',category:'system_issue',state:'QUEUED',version:0,assigned_to:null,admin_name:null,can_send:true,can_claim:false,can_manage:false,can_reopen:false,created_at:'2026-10-11T02:00:00Z'};
const categories = {system_issue:'System issue',account_access:'Account access',workflow_question:'Workflow question',other:'Other concern'};
beforeEach(() => {
  vi.clearAllMocks();window.history.replaceState(null,'','/dashboard?tab=internal-assistance&internalTicket=11');
  api.listTickets.mockResolvedValue({tickets:[ticket],next_cursor:null,categories});
  api.readTicket.mockResolvedValue({ticket,messages:[],next_cursor:null});
  api.createTicket.mockResolvedValue({ticket});api.sendMessage.mockResolvedValue({sent:true,message_id:21});api.changeTicket.mockResolvedValue({ticket});
});
it.each(['Window 1','Secretary','Finance'])('adds a distinct staff assistance destination for %s',desk_assignment => {
  expect(navItemsForUser({...staff,desk_assignment})).toContainEqual(expect.objectContaining({tab:'internal-assistance',icon:'assistance'}));
});
it('excludes students and unsupported desks from assistance navigation',() => {
  for(const user of [{role:'student'},{role:'clerk',desk_assignment:'Other'}]) expect(navItemsForUser(user).some(row => row.tab === 'internal-assistance')).toBe(false);
  expect(navItemsForUser(admin).some(row => row.tab === 'internal-assistance')).toBe(true);
});
it('confirms concern creation, preserves cancelled drafts and sends no student context',async () => {
  render(<InternalAssistanceWorkspace user={staff} />);await screen.findByLabelText('Internal message');
  fireEvent.click(await screen.findByRole('button',{name:'New concern'}));
  fireEvent.change(screen.getByLabelText('Subject'),{target:{value:'Demo concern'}});
  fireEvent.change(screen.getByLabelText('Concern'),{target:{value:'Please assist with the demo workflow.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review concern'}));expect(api.createTicket).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog',{name:'Submit Internal Concern?'})).getByRole('button',{name:'Cancel'}));
  expect(screen.getByLabelText('Subject')).toHaveValue('Demo concern');
  fireEvent.click(screen.getByRole('button',{name:'Review concern'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(() => expect(screen.queryByRole('dialog',{name:'New Internal Concern'})).not.toBeInTheDocument());
  expect(api.createTicket).toHaveBeenCalledWith({subject:'Demo concern',category:'system_issue',description:'Please assist with the demo workflow.',client_key:expect.any(String)});
});
it('blocks duplicate sends, keeps failure feedback through polling and reuses the same retry key',async () => {
  render(<InternalAssistanceWorkspace user={staff} />);await screen.findByLabelText('Internal message');
  let fail;api.sendMessage.mockReturnValueOnce(new Promise((_resolve,reject) => {fail=reject;}));
  fireEvent.change(screen.getByLabelText('Internal message'),{target:{value:'Demo follow-up'}});
  const send = screen.getByRole('button',{name:'Send internal message'});fireEvent.click(send);fireEvent.click(send);
  expect(api.sendMessage).toHaveBeenCalledOnce();expect(send).toBeDisabled();
  await act(async () => fail(new Error('Synthetic unavailable')));expect(screen.getByLabelText('Internal message')).toHaveValue('Demo follow-up');
  await act(async () => {window.dispatchEvent(new Event('focus'));});expect(screen.getByRole('alert')).toHaveTextContent('Keep your draft');
  const key = api.sendMessage.mock.calls[0][1].client_key;fireEvent.click(send);
  await waitFor(() => expect(screen.getByLabelText('Internal message')).toHaveValue(''));
  expect(api.sendMessage.mock.calls[1][1].client_key).toBe(key);
});
it('shows an accepted message and keeps its draft cleared when refresh fails',async () => {
  render(<InternalAssistanceWorkspace user={staff} />);await screen.findByLabelText('Internal message');
  api.readTicket.mockRejectedValue(new Error('Read unavailable'));
  fireEvent.change(screen.getByLabelText('Internal message'),{target:{value:'Accepted message'}});fireEvent.click(screen.getByRole('button',{name:'Send internal message'}));
  await screen.findByText('Accepted message');expect(screen.getByLabelText('Internal message')).toHaveValue('');expect(api.sendMessage).toHaveBeenCalledOnce();
});
it('requires an Admin claim confirmation before opening replies',async () => {
  api.readTicket.mockResolvedValue({ticket:{...ticket,can_send:false,can_claim:true},messages:[],next_cursor:null});
  render(<InternalAssistanceWorkspace user={admin} />);
  fireEvent.click(await screen.findByRole('button',{name:'Claim ticket'}));expect(api.changeTicket).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Internal message')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'New concern'})).not.toBeInTheDocument();
  api.readTicket.mockResolvedValue({ticket:{...ticket,state:'IN_PROGRESS',version:1,assigned_to:9,admin_name:'Demo Admin',can_send:true,can_manage:true},messages:[],next_cursor:null});
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await screen.findByLabelText('Internal message');
  expect(api.changeTicket).toHaveBeenCalledWith('11',{action:'claim',version:0,client_key:expect.any(String)});
});
it('retains resolution drafts on cancellation and shows a stale-version error in the confirmation',async () => {
  api.readTicket.mockResolvedValue({ticket:{...ticket,state:'IN_PROGRESS',assigned_to:9,can_manage:true,version:3},messages:[],next_cursor:null});
  render(<InternalAssistanceWorkspace user={admin} />);fireEvent.click(await screen.findByRole('button',{name:'Resolve concern'}));
  fireEvent.change(screen.getByLabelText('Resolution note'),{target:{value:'Demo configuration corrected.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review resolution'}));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(screen.getByLabelText('Resolution note')).toHaveValue('Demo configuration corrected.');
  fireEvent.click(screen.getByRole('button',{name:'Review resolution'}));
  api.changeTicket.mockRejectedValue({response:{data:{error:'This ticket changed. Refresh it and review the action again.'}}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(() => expect(within(screen.getByRole('dialog',{name:'Confirm Internal Assistance Action'})).getByRole('alert')).toHaveTextContent('Refresh it'));
  expect(api.changeTicket).toHaveBeenCalledWith('11',expect.objectContaining({action:'resolve',version:3,note:'Demo configuration corrected.'}));
});
it('keeps resolved history readable and offers creator reopening without a composer',async () => {
  api.readTicket.mockResolvedValue({ticket:{...ticket,state:'RESOLVED',can_send:false,can_reopen:true},messages:[{id:1,kind:'system',message:'Recorded resolution',created_at:ticket.created_at}],next_cursor:null});
  render(<InternalAssistanceWorkspace user={staff} />);await screen.findByText('Recorded resolution');
  expect(screen.queryByLabelText('Internal message')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Reopen concern'})).toBeInTheDocument();
});
it('passes filters to the authorized queue and preserves the selected conversation',async () => {
  render(<InternalAssistanceWorkspace user={staff} />);await screen.findByLabelText('Internal message');
  const draft = screen.getByLabelText('Internal message');fireEvent.change(draft,{target:{value:'Preserved detail'}});
  fireEvent.change(screen.getAllByLabelText('State')[0],{target:{value:'RESOLVED'}});
  await waitFor(() => expect(api.listTickets).toHaveBeenLastCalledWith(expect.objectContaining({state:'RESOLVED'}),expect.any(AbortSignal)));
  expect(screen.getByLabelText('Internal message')).toBe(draft);expect(draft).toHaveValue('Preserved detail');
});
it('loads chronological older messages without duplicates',async () => {
  const latest={id:80,kind:'message',message:'Latest detail',created_at:ticket.created_at};
  api.readTicket.mockResolvedValueOnce({ticket,messages:[latest],next_cursor:80}).mockResolvedValue({ticket,messages:[{...latest,id:1,message:'Original detail'},latest],next_cursor:null});
  render(<InternalAssistanceWorkspace user={staff} />);fireEvent.click(await screen.findByRole('button',{name:'Load older messages'}));
  await screen.findByText('Original detail');expect(screen.getAllByText('Latest detail')).toHaveLength(1);expect(api.readTicket).toHaveBeenCalledWith('11',80,expect.any(AbortSignal));
});
it('opens another notification ticket while the workspace remains mounted',async () => {
  const view = render(<InternalAssistanceWorkspace user={staff} requestedTicket="11" />);
  await screen.findByLabelText('Internal message');
  view.rerender(<InternalAssistanceWorkspace user={staff} requestedTicket="29" />);
  await waitFor(() => expect(api.readTicket).toHaveBeenCalledWith('29',null,expect.any(AbortSignal)));
});
