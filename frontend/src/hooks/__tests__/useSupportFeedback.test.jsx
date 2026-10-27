import {act,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import useSupportFeedback from '@/hooks/useSupportFeedback';
afterEach(()=>vi.useRealTimers());
it('expires each notice three seconds after it was added and keeps manual dismissal',()=>{
  vi.useFakeTimers();const {result,unmount}=renderHook(useSupportFeedback);
  act(()=>result.current.notify('First saved'));act(()=>vi.advanceTimersByTime(2000));
  act(()=>result.current.notify('Second saved'));act(()=>vi.advanceTimersByTime(999));
  expect(result.current.notices).toHaveLength(2);act(()=>vi.advanceTimersByTime(1));
  expect(result.current.notices.map(row=>row.message)).toEqual(['Second saved']);
  act(()=>result.current.dismiss(result.current.notices[0].id));expect(result.current.notices).toEqual([]);
  act(()=>result.current.notify('Leaving'));unmount();expect(vi.getTimerCount()).toBe(0);
});
