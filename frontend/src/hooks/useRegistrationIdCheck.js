import { useEffect, useRef, useState } from 'react';
import { checkRegistrationId } from '@/services/registrationService';

export default function useRegistrationIdCheck() {
  const [state,setState] = useState({checking:false,error:''});
  const revision = useRef(0);
  const controller = useRef(null);
  useEffect(()=>()=>{ revision.current += 1; controller.current?.abort(); },[]);

  const invalidate = () => {
    revision.current += 1;
    controller.current?.abort();
    controller.current = null;
    setState({checking:false,error:''});
  };
  const check = async id => {
    if (controller.current) return false;
    const version = ++revision.current;
    const request = new AbortController();
    controller.current = request;
    setState({checking:true,error:''});
    try {
      const result = await checkRegistrationId(id.trim(),request.signal);
      if (version !== revision.current) return false;
      setState({checking:false,error:result.available ? '' : 'This ID is already registered. Sign in or reset your password.'});
      return result.available;
    } catch(error) {
      if (version !== revision.current) return false;
      setState({checking:false,error:error.response?.data?.error || 'Could not check this ID. Check your connection and select Continue to retry.'});
      return false;
    } finally {
      if (version === revision.current) controller.current = null;
    }
  };
  return {...state,check,invalidate};
}
