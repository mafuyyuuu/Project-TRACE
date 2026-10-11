import {act,renderHook} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import useReceiptPrinting from '@/hooks/useReceiptPrinting';
import {requestReceiptPrint} from '@/services/receiptService';
vi.mock('@/services/receiptService',()=>({requestReceiptPrint:vi.fn(),receiptError:err=>err.message}));
const frame=()=>({contentDocument:{querySelector:vi.fn(()=>({getBoundingClientRect:()=>({top:10,bottom:5})}))},contentWindow:{focus:vi.fn(),print:vi.fn()}});
beforeEach(()=>vi.clearAllMocks());
it('audits before printing, keeps the key on failure and uses a fresh key for a subsequent reprint',async()=>{
 const {result}=renderHook(()=>useReceiptPrinting(3));const fake=frame();act(()=>{result.current.frame.current=fake;});requestReceiptPrint.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({});
 await act(()=>result.current.print('data-only'));expect(fake.contentWindow.print).not.toHaveBeenCalled();expect(result.current.error).toBe('Network unavailable');const key=requestReceiptPrint.mock.calls[0][1].client_key;
 await act(()=>result.current.print('data-only'));expect(requestReceiptPrint.mock.calls[1][1].client_key).toBe(key);expect(fake.contentWindow.print).toHaveBeenCalledOnce();await act(()=>result.current.print('data-only'));expect(requestReceiptPrint.mock.calls[2][1].client_key).not.toBe(key);
});
it('refuses a clipped receipt before sending a print audit',async()=>{
 const {result}=renderHook(()=>useReceiptPrinting(3));const fake=frame();fake.contentDocument.querySelector.mockImplementation(selector=>({getBoundingClientRect:()=>({top:selector==='.collection'?0:10,bottom:5})}));act(()=>{result.current.frame.current=fake;});await act(()=>result.current.print('full'));expect(result.current.error).toContain('exceed');expect(requestReceiptPrint).not.toHaveBeenCalled();expect(fake.contentWindow.print).not.toHaveBeenCalled();
});
it('blocks simultaneous double clicks during a pending print request',async()=>{
 let resolve;requestReceiptPrint.mockImplementation(()=>new Promise(done=>resolve=done));const {result}=renderHook(()=>useReceiptPrinting(3));act(()=>{result.current.frame.current=frame();});let first;act(()=>{first=result.current.print('full');result.current.print('full');});expect(requestReceiptPrint).toHaveBeenCalledOnce();await act(async()=>{resolve({});await first;});expect(result.current.busy).toBe(false);
});
