import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import useSupportFaqSuggestions from '@/hooks/useSupportFaqSuggestions';
import { matchSupportFaq } from '@/services/supportTicketsService';
vi.mock('@/services/supportTicketsService',()=>({matchSupportFaq:vi.fn()}));
const topics=[{id:'profile',question:'Profile?',answer:'Approved answer.'}];
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();});
afterEach(()=>vi.useRealTimers());
it('debounces matching and never shows a previous query result for a new query',async()=>{
  let firstResolve;
  matchSupportFaq.mockReturnValueOnce(new Promise(resolve=>{firstResolve=resolve;}));
  matchSupportFaq.mockResolvedValueOnce([{id:'email',question:'Email?',answer:'Approved email answer.'}]);
  const {result,rerender}=renderHook(({q})=>useSupportFaqSuggestions(q,topics),{initialProps:{q:'profile'}});
  await act(async()=>vi.advanceTimersByTime(150));
  rerender({q:'email'});
  await act(async()=>firstResolve([{id:'stale',question:'Stale?',answer:'Old result.'}]));
  expect(result.current.topics).toEqual(topics);
  await act(async()=>vi.advanceTimersByTime(150));
  expect(result.current.topics[0].id).toBe('email');
  rerender({q:''});
  expect(result.current.topics).toEqual(topics);
});
it('offers approved topics and an actionable fallback when matching fails',async()=>{
  matchSupportFaq.mockRejectedValue(new Error('Unavailable'));
  const {result}=renderHook(()=>useSupportFaqSuggestions('help',topics));
  await act(async()=>vi.advanceTimersByTime(150));
  expect(result.current.topics).toEqual(topics);
  expect(result.current.error).toContain('Talk to staff');
});
