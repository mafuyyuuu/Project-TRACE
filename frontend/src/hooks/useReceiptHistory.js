import {useEffect,useState} from 'react';
import {receiptHistory,receiptError} from '@/services/receiptService';
import useDataRefresh from '@/hooks/useDataRefresh';
export default function useReceiptHistory(revision) {
 const [data,setData]=useState(null),[error,setError]=useState('');
 const [change,setChange]=useState(0);
 useDataRefresh(['receipts'],()=>setChange(value=>value+1));
 useEffect(()=>{let active=true;receiptHistory().then(value=>{if(active){setData(value);setError('');}}).catch(err=>{if(active)setError(receiptError(err));});return()=>{active=false;};},[revision,change]);
 return {data,error};
}
