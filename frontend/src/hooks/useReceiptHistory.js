import {useEffect,useState} from 'react';
import {receiptHistory,receiptError} from '@/services/receiptService';
export default function useReceiptHistory(revision) {
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;receiptHistory().then(value=>{if(active){setData(value);setError('');}}).catch(err=>{if(active)setError(receiptError(err));});return()=>{active=false;};},[revision]);
 return {data,error};
}
