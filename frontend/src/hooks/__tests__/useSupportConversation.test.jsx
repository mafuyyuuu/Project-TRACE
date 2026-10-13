import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import useSupportConversation from '@/hooks/useSupportConversation';
import * as service from '@/services/supportTicketsService';
vi.mock('@/services/supportTicketsService',()=>({getTicket:vi.fn()}));
vi.mock('@/services/realtimeService',()=>({onNotification:vi.fn(()=>()=>{})}));
beforeEach(()=>{
  vi.clearAllMocks();service.getTicket.mockResolvedValue({ticket:{id:11},messages:[{id:7,message:'Protected case history'}],next_cursor:7});
});
it.each([403,404])('clears protected history and composer context after a denied %s read without discarding the local draft',async status=>{
  const {result}=renderHook(()=>useSupportConversation('11'));
  await waitFor(()=>expect(result.current.data?.ticket.id).toBe(11));
  act(()=>result.current.setInput('Unsent local draft'));
  service.getTicket.mockRejectedValueOnce({response:{status,data:{error:'History unavailable'}}});
  await act(async()=>result.current.refresh());
  expect(result.current.data).toBeNull();expect(result.current.messages).toEqual([]);expect(result.current.cursor).toBeNull();
  expect(result.current.input).toBe('Unsent local draft');expect(result.current.error).toBe('History unavailable');
});
it('retains authorized history and the local draft during a temporary read outage',async()=>{
  const {result}=renderHook(()=>useSupportConversation('11'));
  await waitFor(()=>expect(result.current.data?.ticket.id).toBe(11));
  act(()=>result.current.setInput('Unsent local draft'));
  service.getTicket.mockRejectedValueOnce({response:{status:503}});
  await act(async()=>result.current.refresh());
  expect(result.current.data.ticket.id).toBe(11);expect(result.current.messages).toHaveLength(1);expect(result.current.input).toBe('Unsent local draft');
});
