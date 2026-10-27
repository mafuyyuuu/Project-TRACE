import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import useManualFaqFeedback from '@/hooks/useManualFaqFeedback';
import * as service from '@/services/manualFaqService';
vi.mock('@/services/manualFaqService',()=>({getManualFeedback:vi.fn(),recordManualFaq:vi.fn()}));
const question='Synthetic question?';
beforeEach(()=>{vi.clearAllMocks();service.getManualFeedback.mockResolvedValue([]);service.recordManualFaq.mockResolvedValue(undefined);});
afterEach(()=>vi.useRealTimers());
it('loads saved responses and saves an optional suggestion',async()=>{
  service.getManualFeedback.mockResolvedValue([{question,action:'not_helpful',suggestion:'Saved comment'}]);const {result}=renderHook(useManualFaqFeedback);
  await waitFor(()=>expect(result.current.feedback[question]?.suggestion).toBe('Saved comment'));
  act(()=>result.current.setDraft(question,'Include an example.'));await act(async()=>result.current.saveSuggestion(question));
  expect(service.recordManualFaq).toHaveBeenCalledWith(expect.objectContaining({question,action:'not_helpful',suggestion:'Include an example.'}),expect.any(AbortSignal));
});
it('retains failed feedback and reuses its retry key',async()=>{
  service.recordManualFaq.mockRejectedValueOnce(new Error('Offline'));const {result}=renderHook(useManualFaqFeedback);
  act(()=>result.current.choose(question,'not_helpful'));
  await act(async()=>result.current.saveSuggestion(question));expect(result.current.errors[question]).toContain('not saved');
  await act(async()=>result.current.retry(question));
  expect(service.recordManualFaq.mock.calls[1][0].client_key).toBe(service.recordManualFaq.mock.calls[0][0].client_key);
  expect(result.current.errors[question]).toBe('');
});
it('submits No with its optional suggestion once, then resets the card and expires confirmation',async()=>{
 const {result}=renderHook(useManualFaqFeedback);
 await waitFor(()=>expect(service.getManualFeedback).toHaveBeenCalled());
 vi.useFakeTimers();
 act(()=>result.current.choose(question,'not_helpful'));
 expect(service.recordManualFaq).not.toHaveBeenCalled();
 act(()=>result.current.setDraft(question,'Show the next step.'));
 await act(async()=>result.current.saveSuggestion(question));
 expect(service.recordManualFaq).toHaveBeenCalledOnce();
 expect(service.recordManualFaq.mock.calls[0][0]).toMatchObject({action:'not_helpful',suggestion:'Show the next step.'});
 expect(result.current.selected[question]).toBeNull();expect(result.current.drafts[question]).toBe('');
 expect(result.current.notices[question]).toContain('saved');
 act(()=>vi.advanceTimersByTime(4000));expect(result.current.notices[question]).toBe('');
});
it('resets Yes after saving and retains historical results without selecting them',async()=>{
 service.getManualFeedback.mockResolvedValue([{question,action:'not_helpful',suggestion:'Old comment'}]);
 const {result}=renderHook(useManualFaqFeedback);
 await waitFor(()=>expect(result.current.feedback[question]?.suggestion).toBe('Old comment'));
 expect(result.current.selected[question]).toBeUndefined();
 await act(async()=>result.current.choose(question,'helpful'));
 expect(result.current.feedback[question].action).toBe('helpful');
 expect(result.current.selected[question]).toBeNull();
});
it('guards concurrent saves, deduplicates views and aborts private operations on unmount',async()=>{
  service.recordManualFaq.mockImplementation(()=>new Promise(()=>{}));const {result,unmount}=renderHook(useManualFaqFeedback);
  act(()=>{result.current.view(question);result.current.view(question);result.current.choose(question,'helpful');result.current.choose(question,'not_helpful');});
  expect(service.recordManualFaq).toHaveBeenCalledTimes(2);expect(result.current.selected[question]).toBe('helpful');
  const signals=service.recordManualFaq.mock.calls.map(call=>call[1]);unmount();expect(signals.every(signal=>signal.aborted)).toBe(true);
});
it('clears an old failed response when the reader chooses a new answer',async()=>{
 service.recordManualFaq.mockRejectedValueOnce(new Error('Offline'));
 const {result}=renderHook(useManualFaqFeedback);
 await act(async()=>result.current.choose(question,'helpful'));
 expect(result.current.errors[question]).toContain('not saved');
 act(()=>result.current.choose(question,'not_helpful'));
 expect(result.current.errors[question]).toBe('');
 expect(result.current.selected[question]).toBe('not_helpful');
 expect(service.recordManualFaq).toHaveBeenCalledOnce();
});
