import {act,renderHook,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import useVolumeForecast from '@/hooks/useVolumeForecast';
import {getForecast} from '@/services/documentsService';
vi.mock('@/services/documentsService',()=>({getForecast:vi.fn()}));
vi.mock('@/hooks/useDataRefresh',()=>({default:()=>{}}));
it('fetches exact type estimates, cancels stale reads and preserves zero volumes',async()=>{
 let resolveFirst;
 getForecast.mockReturnValueOnce(new Promise(resolve=>{resolveFirst=resolve;})).mockResolvedValue({source:'prophet',forecast:[{date:'2026-10-18',predicted_volume:0}],document_types:['Graduation Clearance']});
 const {result}=renderHook(()=>useVolumeForecast(true));
 await waitFor(()=>expect(getForecast).toHaveBeenCalledTimes(1));
 const oldSignal=getForecast.mock.calls[0][1];
 act(()=>result.current.setFilter('Graduation Clearance'));
 await waitFor(()=>expect(result.current.source).toBe('prophet'));
 expect(oldSignal.aborted).toBe(true);
 expect(getForecast.mock.calls[1][0]).toBe('Graduation Clearance');
 await act(async()=>resolveFirst({source:'old',forecast:[{predicted_volume:99}]}));
 expect(result.current.forecast[0].predicted_volume).toBe(0);
});
it('shows unavailable without retaining an obsolete forecast and allows retry',async()=>{
 getForecast.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({forecast:[],source:'insufficient_data'});
 const {result}=renderHook(()=>useVolumeForecast(true));
 await waitFor(()=>expect(result.current.error).toMatch(/unavailable/));
 expect(result.current.forecast).toEqual([]);
 await act(()=>result.current.refresh());
 expect(result.current.error).toBeUndefined();
 expect(result.current.source).toBe('insufficient_data');
});
