import { useEffect, useRef, useState } from 'react';
import { extractSignupId } from '@/services/authService';

export default function useSignupOcr(file, userType, onExtracted) {
  const activeRequest = useRef(null);
  const [state, setState] = useState({ file: null, userType: null, reading: false, message: '' });
  useEffect(() => () => activeRequest.current?.abort(), [file, userType]);
  const readId = async () => {
    if (!file || (state.file === file && state.userType === userType && state.reading)) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ file, userType, reading: true, message: '' });
    try {
      const result = await extractSignupId(file, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.success) onExtracted(result);
      setState({ file, userType, reading: false, message: result.message || 'Review the details or enter them manually.' });
    } catch (err) {
      if (!controller.signal.aborted) setState({ file, userType, reading: false, message: err.response?.data?.error || 'Could not read this ID. Enter the details manually.' });
    }
  };
  return { readId, reading: state.file === file && state.userType === userType && state.reading,
    message: state.file === file && state.userType === userType ? state.message : '' };
}
