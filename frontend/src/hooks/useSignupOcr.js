import { useEffect, useRef, useState } from 'react';
import { extractSignupId } from '@/services/authService';

export default function useSignupOcr(file, userType, onExtracted) {
  const activeRequest = useRef(null);
  const cached = useRef(null);
  const extractedCallback = useRef(onExtracted);
  useEffect(() => { extractedCallback.current = onExtracted; }, [onExtracted]);
  const [state, setState] = useState({ file:null, userType:null, reading:false, message:'' });
  useEffect(() => () => {
    activeRequest.current?.controller.abort();
    cached.current = null;
  }, [file, userType]);
  const readId = async () => {
    if (!file) return;
    const pending = activeRequest.current;
    if (pending?.file === file && pending.userType === userType && !pending.controller.signal.aborted) return;
    if (cached.current?.file === file && cached.current.userType === userType) {
      extractedCallback.current(cached.current.result);
      setState({ file,userType,reading:false,message:'Using the earlier read for this image. Review the details or enter corrections manually.' });
      return;
    }
    pending?.controller.abort();
    const request = { file,userType,controller:new AbortController() };
    activeRequest.current = request;
    setState({ file,userType,reading:true,message:'' });
    try {
      const result = await extractSignupId(file,{ signal:request.controller.signal });
      if (request.controller.signal.aborted || activeRequest.current !== request) return;
      if (result.success) {
        cached.current = { file,userType,result };
        extractedCallback.current(result);
      }
      setState({ file,userType,reading:false,message:result.message || 'Review the details or enter them manually.' });
    } catch (error) {
      if (!request.controller.signal.aborted && activeRequest.current === request) {
        const timedOut = ['ECONNABORTED','ETIMEDOUT'].includes(error.code);
        setState({ file,userType,reading:false,message:error.response?.data?.error || (timedOut ? 'Reading this ID took too long. Retry or enter the details manually.' : 'Could not read this ID. Enter the details manually.') });
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = null;
    }
  };
  return {
    readId, reading:state.file === file && state.userType === userType && state.reading,
    message:state.file === file && state.userType === userType ? state.message : '',
  };
}
