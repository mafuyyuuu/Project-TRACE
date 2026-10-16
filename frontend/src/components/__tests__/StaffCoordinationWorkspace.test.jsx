import {beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import StaffCoordinationWorkspace from '@/components/StaffCoordinationWorkspace';
import * as api from '@/services/staffConversationService';
vi.mock('@/services/staffConversationService',()=>({listConversations:vi.fn(),listRecipients:vi.fn(),readConversation:vi.fn(),openConversation:vi.fn(),sendMessage:vi.fn()}));
vi.mock('@/services/realtimeService',()=>({onNotification:vi.fn(()=>()=>{})}));
const staff={id:4,full_name:'Demo Cashier',role:'clerk',desk_assignment:'Finance'};
const thread={id:21,scope_college_id:0,can_send:true,participants:[{id:4,full_name:'Demo Cashier',desk_assignment:'Finance'},{id:7,full_name:'Demo Registrar',desk_assignment:'Window 1'}],created_at:'2026-10-11T02:00:00Z',updated_at:'2026-10-11T02:00:00Z'};
const row={id:1,sender_id:7,sender_name:'Demo Registrar',message:'Recorded coordination',created_at:thread.created_at};
beforeEach(()=>{
  vi.clearAllMocks();api.listConversations.mockResolvedValue({conversations:[thread],next_cursor:null,access_scope:'clerk:Finance:0'});
  api.listRecipients.mockResolvedValue({recipients:[thread.participants[1]],next_cursor:null});
  api.readConversation.mockResolvedValue({conversation:thread,messages:[row],next_cursor:null});
  api.openConversation.mockResolvedValue({conversation:thread,message_id:2});api.sendMessage.mockResolvedValue({message_id:3});
});
it('confirms the selected staff recipient and first message, preserves cancellation and excludes client context',async()=>{
  render(<StaffCoordinationWorkspace user={staff}/>);fireEvent.click(screen.getByRole('button',{name:'New conversation'}));
  fireEvent.click(await within(screen.getByRole('group',{name:'Staff recipients'})).findByRole('button',{name:/Demo Registrar/}));fireEvent.change(screen.getByLabelText('First message'),{target:{value:'Please coordinate the demo handoff.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review conversation'}));expect(api.openConversation).not.toHaveBeenCalled();fireEvent.click(within(screen.getByRole('dialog',{name:'Start Staff Conversation?'})).getByRole('button',{name:'Cancel'}));
  expect(screen.getByLabelText('First message')).toHaveValue('Please coordinate the demo handoff.');
  fireEvent.click(screen.getByRole('button',{name:'Review conversation'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(()=>expect(screen.queryByRole('dialog',{name:'New Staff Conversation'})).not.toBeInTheDocument());
  expect(api.openConversation).toHaveBeenCalledWith({recipient_id:7,message:'Please coordinate the demo handoff.',client_key:expect.any(String)});await screen.findByText('Recorded coordination');
});
it('keeps a failed creation confirmation and its retry payload for retry',async()=>{
  api.openConversation.mockRejectedValue({response:{data:{error:'Recipient is unavailable'}}});render(<StaffCoordinationWorkspace user={staff}/>);
  fireEvent.click(screen.getByRole('button',{name:'New conversation'}));fireEvent.click(await within(screen.getByRole('group',{name:'Staff recipients'})).findByRole('button',{name:/Demo Registrar/}));fireEvent.change(screen.getByLabelText('First message'),{target:{value:'Demo concern'}});
  fireEvent.click(screen.getByRole('button',{name:'Review conversation'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  const dialog=screen.getByRole('dialog',{name:'Start Staff Conversation?'});await waitFor(()=>expect(within(dialog).getByRole('alert')).toHaveTextContent('Recipient is unavailable'));
  const first=api.openConversation.mock.calls[0][0];fireEvent.click(within(dialog).getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(api.openConversation).toHaveBeenCalledTimes(2));expect(api.openConversation.mock.calls[1][0]).toEqual(first);
  await waitFor(()=>expect(within(dialog).getByRole('button',{name:'Cancel'})).toBeEnabled());fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));fireEvent.click(screen.getByRole('button',{name:'Review conversation'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(api.openConversation).toHaveBeenCalledTimes(3));expect(api.openConversation.mock.calls[2][0]).toEqual(first);
});
it('loads authoritative recipient search and handles empty/failure states without auto-selecting',async()=>{
  api.listRecipients.mockResolvedValue({recipients:[],next_cursor:null});render(<StaffCoordinationWorkspace user={staff}/>);fireEvent.click(screen.getByRole('button',{name:'New conversation'}));
  await screen.findByText('No eligible recipients match.');fireEvent.change(screen.getByLabelText('Find recipient'),{target:{value:'Secretary'}});
  await waitFor(()=>expect(api.listRecipients).toHaveBeenLastCalledWith({search:'Secretary',before:null},expect.any(AbortSignal)));expect(screen.getByRole('button',{name:'Review conversation'})).toBeDisabled();
});
it('keeps Admin read-only even if older API flags claim sending is allowed',async()=>{
  render(<StaffCoordinationWorkspace user={{id:9,role:'admin'}} requestedConversation="21"/>);await screen.findByText('Recorded coordination');
  expect(screen.queryByRole('button',{name:'New conversation'})).not.toBeInTheDocument();expect(screen.queryByLabelText('Staff message')).not.toBeInTheDocument();expect(screen.getByText('Admin monitoring — read-only.')).toBeInTheDocument();expect(api.listRecipients).not.toHaveBeenCalled();
});
it('prevents duplicate pending sends and retains failed drafts and keys across retry and refresh',async()=>{
  let reject;api.sendMessage.mockImplementationOnce(()=>new Promise((_resolve,fail)=>{reject=fail;})).mockRejectedValue({response:{data:{error:'Connection lost'}}});
  render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);const input=await screen.findByLabelText('Staff message');fireEvent.change(input,{target:{value:'Retain this detail'}});const form=input.closest('form');fireEvent.submit(form);fireEvent.submit(form);expect(api.sendMessage).toHaveBeenCalledOnce();
  await act(async()=>reject({response:{data:{error:'Connection lost'}}}));expect(input).toHaveValue('Retain this detail');
  fireEvent(window,new Event('focus'));await waitFor(()=>expect(api.readConversation).toHaveBeenCalledTimes(2));expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
  fireEvent.submit(form);await waitFor(()=>expect(api.sendMessage).toHaveBeenCalledTimes(2));expect(api.sendMessage.mock.calls[1][1]).toEqual(api.sendMessage.mock.calls[0][1]);
});
it('clears an accepted message even if subsequent history refresh fails',async()=>{
  api.readConversation.mockResolvedValueOnce({conversation:thread,messages:[row],next_cursor:null}).mockRejectedValue({response:{data:{error:'Refresh unavailable'}}});
  render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);const input=await screen.findByLabelText('Staff message');fireEvent.change(input,{target:{value:'Accepted message'}});fireEvent.submit(input.closest('form'));
  await waitFor(()=>expect(input).toHaveValue(''));expect(await screen.findByText('Accepted message')).toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('Refresh unavailable');expect(api.sendMessage).toHaveBeenCalledOnce();
});
it('opens a changed notification conversation without reopening the workspace',async()=>{
  const view=render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);await screen.findByText('Recorded coordination');view.rerender(<StaffCoordinationWorkspace user={staff} requestedConversation="22"/>);
  await waitFor(()=>expect(api.readConversation).toHaveBeenCalledWith('22',null,expect.any(AbortSignal)));
});
it('keeps read-only participant history without a composer when a desk becomes unavailable',async()=>{
  api.readConversation.mockResolvedValue({conversation:{...thread,can_send:false},messages:[row],next_cursor:null});render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);await screen.findByText('Recorded coordination');expect(screen.queryByLabelText('Staff message')).not.toBeInTheDocument();expect(screen.getByText(/A participant or college assignment is unavailable/)).toBeInTheDocument();
});
it('bridges missed message pages after reconnect rather than dropping the middle of history',async()=>{
  api.readConversation.mockResolvedValueOnce({conversation:thread,messages:[row],next_cursor:null})
    .mockResolvedValueOnce({conversation:thread,messages:[{...row,id:120,message:'Newest message'}],next_cursor:120})
    .mockResolvedValueOnce({conversation:thread,messages:[{...row,id:60,message:'Middle message'}],next_cursor:60})
    .mockResolvedValue({conversation:thread,messages:[row],next_cursor:null});
  render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);await screen.findByText('Recorded coordination');fireEvent(window,new Event('focus'));await screen.findByText('Middle message');expect(screen.getByText('Newest message')).toBeInTheDocument();expect(screen.getAllByText('Recorded coordination')).toHaveLength(1);expect(api.readConversation).toHaveBeenCalledWith('21',60,expect.any(AbortSignal));
});
it('clears cached conversations when the authoritative college scope changes',async()=>{
  render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);await screen.findByText('Recorded coordination');
  api.listConversations.mockResolvedValue({conversations:[],next_cursor:null,access_scope:'clerk:Secretary:3'});fireEvent(window,new Event('focus'));
  await waitFor(()=>expect(screen.queryByText('Recorded coordination')).not.toBeInTheDocument());
});
it('discards protected history when authorization is revoked on refresh',async()=>{
  render(<StaffCoordinationWorkspace user={staff} requestedConversation="21"/>);await screen.findByText('Recorded coordination');api.readConversation.mockRejectedValue({response:{status:403,data:{error:'Access revoked'}}});fireEvent(window,new Event('focus'));
  await waitFor(()=>expect(screen.queryByText('Recorded coordination')).not.toBeInTheDocument());expect(screen.queryByLabelText('Staff message')).not.toBeInTheDocument();
});
