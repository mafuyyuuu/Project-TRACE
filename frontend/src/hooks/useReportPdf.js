import {useEffect,useRef,useState} from 'react';
import {downloadReportPdf} from '@/services/reportsService';
/** One read-only export at a time; cancel protected reads when the owner unmounts. */
export default function useReportPdf() {
  const [state,setState]=useState({exporting:false,error:'',success:''});
  const alive=useRef(false),pending=useRef(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;pending.current?.abort();};},[]);
  const download=async(kind,filters)=>{
    if(pending.current)return false;
    const controller=new AbortController();pending.current=controller;
    setState({exporting:true,error:'',success:''});
    try {
      const filename=await downloadReportPdf(kind,{...filters},controller.signal);
      if(!controller.signal.aborted && alive.current)setState({exporting:false,error:'',success:`Downloaded ${filename}`});
      return !controller.signal.aborted;
    } catch(error) {
      if(!controller.signal.aborted && alive.current)setState({exporting:false,error:error.response?.data?.error || error.message || 'PDF export failed. Please retry.',success:''});
      return false;
    } finally {if(pending.current===controller)pending.current=null;}
  };
  return{...state,download,dismiss:()=>setState(previous=>({...previous,error:'',success:''}))};
}
