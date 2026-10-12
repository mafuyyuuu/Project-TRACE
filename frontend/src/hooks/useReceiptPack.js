import {useCallback,useEffect,useState} from 'react';
import {receiptState,receiptError} from '@/services/receiptService';
export default function useReceiptPack() {
 const [state,setState]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(value=>value+1),[]);
 useEffect(()=>{
  let active=true;
  receiptState().then(value=>{if(active){setState(value);setError('');}}).catch(err=>{if(active){setState(null);setError(receiptError(err));}}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[revision]);
 return {state,error,loading,refresh};
}
