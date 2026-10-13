import {useRef} from 'react';
import * as service from '@/services/receiptService';
/** API boundary for receipt forms; components own only their drafts and review presentation. */
export default function useReceiptActions() {
 const pending=useRef(false);
 async function run(work){if(pending.current)throw new Error('A receipt action is already in progress.');pending.current=true;try{return await work();}finally{pending.current=false;}}
 return {
  preview:body=>run(()=>service.previewPack(body)),activate:body=>run(()=>service.savePack(body)),
  issue:(id,body)=>run(()=>service.issueReceipt(id,body)),read:id=>run(()=>service.readReceipt(id)),
  saveSettings:body=>run(()=>service.savePrintSettings(body)),void:(id,body)=>run(()=>service.voidReceipt(id,body)),
 };
}
