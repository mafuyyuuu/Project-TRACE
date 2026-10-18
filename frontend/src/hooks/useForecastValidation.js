import {useEffect,useRef,useState} from 'react';
import {evaluateForecast} from '@/services/documentsService';
export default function useForecastValidation(documentType) {
  const [state,setState]=useState({loading:false,data:null,error:''});
  const read=useRef(null),alive=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;read.current?.abort();};},[]);
  const run=async()=>{
    if(read.current)return;
    const controller=new AbortController();read.current=controller;setState({loading:true,data:null,error:''});
    try {const data=await evaluateForecast(documentType,controller.signal);if(alive.current && !controller.signal.aborted)setState({loading:false,data,error:''});}
    catch(error){if(alive.current && !controller.signal.aborted)setState({loading:false,data:null,error:error.response?.data?.error || error.message || 'Forecast validation failed. No score was calculated.'});}
    finally{if(read.current===controller)read.current=null;}
  };
  return {...state,run};
}
