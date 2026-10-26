import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import useSupportTickets from '@/hooks/useSupportTickets';
import * as service from '@/services/supportTicketsService';
vi.mock('@/services/supportTicketsService',()=>({getTickets:vi.fn(),getSupportSettings:vi.fn(),getSupportFaq:vi.fn(),resolveSupportContext:vi.fn(),createTicket:vi.fn()}));
vi.mock('@/services/realtimeService',()=>({onNotification:vi.fn(()=>()=>{})}));
const user={id:3,role:'student'};
const ticket=id=>({id,subject:'Synthetic support',state:'QUEUED'});
const mount=props=>renderHook(({documentId,ticketId,supportId})=>useSupportTickets(user,documentId,ticketId,supportId),{initialProps:props});
beforeEach(()=>{
  vi.clearAllMocks();window.history.replaceState(null,'','/dashboard?tab=messages');
  service.getTickets.mockResolvedValue({tickets:[],next_cursor:null});
  service.getSupportSettings.mockResolvedValue({});service.getSupportFaq.mockResolvedValue([]);
  service.resolveSupportContext.mockResolvedValue(ticket(7));
});
it('follows successive ticket notifications and preserves manual selection between route changes',async()=>{
  const {result,rerender}=mount({ticketId:'11'});
  expect(result.current.selected).toBe('11');
  act(()=>result.current.setSelected('12'));
  expect(result.current.selected).toBe('12');
  rerender({ticketId:'18'});
  await waitFor(()=>expect(result.current.selected).toBe('18'));
  expect(service.resolveSupportContext).not.toHaveBeenCalled();
});
it('resolves successive general-support links on the mounted screen',async()=>{
  service.resolveSupportContext.mockResolvedValueOnce(ticket(7)).mockResolvedValueOnce(ticket(9));
  const {result,rerender}=mount({supportId:'3'});
  await waitFor(()=>expect(result.current.selected).toBe('7'));
  rerender({supportId:'5'});
  await waitFor(()=>expect(result.current.selected).toBe('9'));
  expect(service.resolveSupportContext).toHaveBeenLastCalledWith({student_user_id:'5'},expect.any(AbortSignal));
});
it('prioritizes an explicit ticket over document and general context',async()=>{
  const {result}=mount({ticketId:'18',documentId:'42',supportId:'3'});
  await waitFor(()=>expect(result.current.loading).toBe(false));
  expect(result.current.selected).toBe('18');
  expect(service.resolveSupportContext).not.toHaveBeenCalled();
});
it('aborts an old document lookup so it cannot overwrite a later ticket notification',async()=>{
  let resolve;
  service.resolveSupportContext.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const {result,rerender}=mount({documentId:'42'});
  const signal=service.resolveSupportContext.mock.calls[0][1];
  rerender({ticketId:'18'});
  await waitFor(()=>expect(result.current.selected).toBe('18'));
  expect(signal.aborted).toBe(true);
  await act(async()=>resolve(ticket(7)));
  expect(result.current.selected).toBe('18');
  expect(result.current.tickets.some(row=>row.id===7)).toBe(false);
});
it('ignores an obsolete general-context error after navigation',async()=>{
  let reject;
  service.resolveSupportContext.mockReturnValueOnce(new Promise((_,fail)=>{reject=fail;}));
  const {result,rerender}=mount({supportId:'3'});
  rerender({ticketId:'18'});
  await act(async()=>reject(new Error('Old lookup failed')));
  expect(result.current.error).toBe('');
  expect(result.current.selected).toBe('18');
});
it('discards cached ticket rows and selection when authoritative college or desk scope changes',async()=>{
  service.getTickets.mockResolvedValueOnce({tickets:[ticket(11)],next_cursor:11,access_scope:'old-scope'})
    .mockResolvedValueOnce({tickets:[ticket(18)],next_cursor:null,access_scope:'new-scope'});
  const {result}=mount({ticketId:'11'});
  await waitFor(()=>expect(result.current.tickets).toHaveLength(1));
  await act(async()=>result.current.refresh());
  expect(result.current.tickets.map(row=>row.id)).toEqual([18]);
  expect(result.current.selected).toBe('');expect(result.current.cursor).toBeNull();
});
it('clears cached rows on denied access but retains them on a temporary failure',async()=>{
  service.getTickets.mockResolvedValueOnce({tickets:[ticket(11)],next_cursor:11,access_scope:'scope'});
  const {result}=mount({ticketId:'11'});
  await waitFor(()=>expect(result.current.tickets).toHaveLength(1));
  service.getTickets.mockRejectedValueOnce({response:{status:503}});
  await act(async()=>result.current.refresh());
  expect(result.current.tickets.map(row=>row.id)).toEqual([11]);expect(result.current.selected).toBe('11');
  service.getTickets.mockRejectedValueOnce({response:{status:403,data:{error:'Access revoked'}}});
  await act(async()=>result.current.refresh());
  expect(result.current.tickets).toEqual([]);expect(result.current.selected).toBe('');expect(result.current.cursor).toBeNull();
  expect(result.current.error).toBe('Access revoked');
});
it('aborts Active paging when switching to Archive and ignores its late response',async()=>{
 let finishActive;
 service.getTickets.mockReturnValueOnce(new Promise(resolve=>{finishActive=resolve;})).mockResolvedValue({tickets:[{...ticket(2),state:'RESOLVED'}],next_cursor:2});
 const {result}=mount({});
 await waitFor(()=>expect(service.getTickets).toHaveBeenCalledOnce());
 const signal=service.getTickets.mock.calls[0][1];
 act(()=>result.current.changeView('archive'));
 await waitFor(()=>expect(result.current.tickets.map(row=>row.id)).toEqual([2]));
 expect(signal.aborted).toBe(true);
 expect(service.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'archive');
 await act(async()=>finishActive({tickets:[ticket(11)],next_cursor:11}));
 expect(result.current.tickets.map(row=>row.id)).toEqual([2]);
 expect(result.current.cursor).toBe(2);
});
it('moves a selected resolved ticket to Archive and a reopened ticket to Active without dropping selection',async()=>{
 const {result}=mount({ticketId:'11'});
 await waitFor(()=>expect(result.current.loading).toBe(false));
 act(()=>result.current.observeTicket({...ticket(11),state:'RESOLVED'}));
 await waitFor(()=>expect(service.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'archive'));
 expect(result.current.selected).toBe('11');
 act(()=>result.current.observeTicket(ticket(11)));
 await waitFor(()=>expect(service.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'active'));
 expect(result.current.selected).toBe('11');
});
it('removes a remotely resolved ticket from the next Active refresh instead of retaining a stale cached row',async()=>{
 service.getTickets.mockResolvedValueOnce({tickets:[ticket(11)],next_cursor:11}).mockResolvedValueOnce({tickets:[],next_cursor:null});
 const {result}=mount({});
 await waitFor(()=>expect(result.current.tickets).toHaveLength(1));
 await act(async()=>result.current.refresh());
 expect(result.current.tickets).toEqual([]);expect(result.current.cursor).toBeNull();
});
it('cancels a pre-creation list read so its late response cannot hide the new ticket',async()=>{
 let finishOld;
 service.getTickets.mockReturnValueOnce(new Promise(resolve=>{finishOld=resolve;}))
   .mockResolvedValue({tickets:[ticket(19)],next_cursor:null});
 service.createTicket.mockResolvedValue(ticket(19));
 const {result}=mount({});
 await waitFor(()=>expect(service.getTickets).toHaveBeenCalledOnce());
 const signal=service.getTickets.mock.calls[0][1];
 await act(async()=>result.current.execute({kind:'create',payload:{subject:'New'}}));
 expect(signal.aborted).toBe(true);
 await act(async()=>finishOld({tickets:[ticket(2)],next_cursor:2}));
 expect(result.current.tickets.map(row=>row.id)).toEqual([19]);
 expect(result.current.selected).toBe('19');
});
it('opens newly created general support in Active when starting from Archive',async()=>{
 service.getTickets.mockImplementation((_before,_signal,view)=>Promise.resolve({tickets:view==='archive' ? [{...ticket(2),state:'RESOLVED'}] : [ticket(19)],next_cursor:null}));
 service.createTicket.mockResolvedValue(ticket(19));
 const {result}=mount({});
 await waitFor(()=>expect(result.current.loading).toBe(false));
 act(()=>result.current.changeView('archive'));
 await waitFor(()=>expect(result.current.tickets[0]?.id).toBe(2));
 await act(async()=>result.current.execute({kind:'create',payload:{subject:'New'}}));
 await waitFor(()=>expect(result.current.view).toBe('active'));
 await waitFor(()=>expect(result.current.tickets.map(row=>row.id)).toEqual([19]));
 expect(result.current.selected).toBe('19');
 expect(service.getTickets).toHaveBeenLastCalledWith(null,expect.any(AbortSignal),'active');
});
it('keeps the same unresolved ticket when the server reuses it and closes without waiting for background reads',async()=>{
 const {result}=mount({});
 await waitFor(()=>expect(result.current.loading).toBe(false));
 service.createTicket.mockResolvedValue(ticket(7));
 service.getTickets.mockImplementation(()=>new Promise(()=>{}));
 await act(async()=>expect(result.current.execute({kind:'create',payload:{subject:'Another concern'}})).resolves.toBe(true));
 expect(result.current.selected).toBe('7');expect(result.current.tickets.map(row=>row.id)).toEqual([7]);
 expect(result.current.busy).toBe(false);
});
