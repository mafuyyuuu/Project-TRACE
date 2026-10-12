import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useSignupOcr from '@/hooks/useSignupOcr';
import { extractSignupId } from '@/services/authService';
vi.mock('@/services/authService', () => ({ extractSignupId: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it('runs only on explicit read and passes extracted fields to the form', async () => {
  const file = new File(['id'], 'id.png');
  const extracted = vi.fn();
  extractSignupId.mockResolvedValue({ success: true, alumni_id: 'ALU1234567', message: 'Review the fields.' });
  const { result } = renderHook(() => useSignupOcr(file, 'alumni', extracted));
  expect(extractSignupId).not.toHaveBeenCalled();
  await act(async () => result.current.readId());
  expect(extractSignupId).toHaveBeenCalledWith(file, { signal: expect.any(AbortSignal) });
  expect(extracted).toHaveBeenCalledWith(expect.objectContaining({ alumni_id: 'ALU1234567' }));
  expect(result.current.reading).toBe(false);
});

it('discards an old result after file or account type changes', async () => {
  let finish;
  extractSignupId.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const extracted = vi.fn();
  const first = new File(['one'], 'one.png');
  const { result, rerender } = renderHook(({ file, type }) => useSignupOcr(file, type, extracted),
    { initialProps: { file: first, type: 'student' } });
  let pending;
  act(() => { pending = result.current.readId(); });
  expect(result.current.reading).toBe(true);
  const signal = extractSignupId.mock.calls[0][1].signal;
  rerender({ file: new File(['two'], 'two.png'), type: 'alumni' });
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ success: true, student_id: 'STU1234567' }); await pending; });
  expect(extracted).not.toHaveBeenCalled();
  expect(result.current.reading).toBe(false);
});

it('leaves manual entry available after extraction failure', async () => {
  extractSignupId.mockRejectedValue(new Error('timeout'));
  const extracted = vi.fn();
  const file = new File(['id'], 'id.png');
  const { result } = renderHook(() => useSignupOcr(file, 'student', extracted));
  await act(async () => result.current.readId());
  expect(result.current.message).toMatch(/manually/);
  expect(result.current.reading).toBe(false);
  expect(extracted).not.toHaveBeenCalled();
});

it('guards duplicate reads before React rerenders and reuses only successful results',async()=>{
 let finish;extractSignupId.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const file=new File(['id'],'id.png'),extracted=vi.fn();
 const {result}=renderHook(()=>useSignupOcr(file,'student',extracted));
 let first,second;act(()=>{first=result.current.readId();second=result.current.readId();});
 expect(extractSignupId).toHaveBeenCalledOnce();
 await act(async()=>{finish({success:true,student_id:'23-00939',message:'Review.'});await Promise.all([first,second]);});
 await act(async()=>result.current.readId());
 expect(extractSignupId).toHaveBeenCalledOnce();expect(extracted).toHaveBeenCalledTimes(2);
});
it('permits retry after failure and surfaces a browser timeout separately',async()=>{
 extractSignupId.mockRejectedValueOnce({code:'ECONNABORTED'});
 const file=new File(['id'],'id.png');
 const {result}=renderHook(()=>useSignupOcr(file,'student',vi.fn()));
 await act(async()=>result.current.readId());expect(result.current.message).toMatch(/took too long/);
 extractSignupId.mockResolvedValueOnce({success:true,student_id:'23-00939'});
 await act(async()=>result.current.readId());expect(extractSignupId).toHaveBeenCalledTimes(2);
});

it('uses the latest extraction callback when the catalog/form changes during a scan',async()=>{
 let finish;extractSignupId.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const file=new File(['id'],'id.png'),first=vi.fn(),latest=vi.fn();
 const {result,rerender}=renderHook(({callback})=>useSignupOcr(file,'student',callback),{initialProps:{callback:first}});
 let pending;act(()=>{pending=result.current.readId();});rerender({callback:latest});
 await act(async()=>{finish({success:true,student_id:'23-00939'});await pending;});
 expect(first).not.toHaveBeenCalled();expect(latest).toHaveBeenCalledOnce();
});
