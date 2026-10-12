import {useRef,useState} from 'react';
import {requestReceiptPrint,receiptError} from '@/services/receiptService';
export default function useReceiptPrinting(receiptId) {
 const pending=useRef(false);
 const frame=useRef(null),retryKey=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function print(mode) {
  if(pending.current)return;pending.current=true;setBusy(true);setError('');retryKey.current ||= crypto.randomUUID();
  try{
   const doc=frame.current?.contentDocument;
   if(!doc?.querySelector('.paper'))throw new Error('The receipt preview is still loading. Retry when it is ready.');
   for(const [before,after] of [['.payor','.collection'],['.collection table','.total'],['.words','.reference'],['.reference','.cashier'],['.cashier','.footer']]){
    if(doc.querySelector(before).getBoundingClientRect().bottom>doc.querySelector(after).getBoundingClientRect().top)throw new Error('Receipt details exceed the selected layout. Review calibration or name/line lengths before printing.');
   }
   await requestReceiptPrint(receiptId,{mode,client_key:retryKey.current});frame.current.contentWindow.focus();frame.current.contentWindow.print();retryKey.current=null;}
  catch(err){setError(receiptError(err));}finally{pending.current=false;setBusy(false);}
 }
 return {frame,busy,error,print};
}
