import { useEffect, useState } from 'react';
import { lookupStudent } from '@/services/authService';

export default function useStudentProfile(open, studentId) {
  const [state, setState] = useState({ studentId: null, user: null, loading: false, error: '' });
  useEffect(() => {
    if (!open || !studentId) return;
    const controller = new AbortController();
    let current = true;
    lookupStudent(studentId, { signal: controller.signal }).then(result => {
      if (current) setState({ studentId, user: result.student, loading: false, error: '' });
    }).catch(err => {
      if (current) setState({ studentId, user: null, loading: false, error: err.response?.data?.error || 'Could not load this profile. Close and try again.' });
    });
    return () => { current = false; controller.abort(); };
  }, [open, studentId]);
  if (!open) return { user: null, loading: false, error: '' };
  return state.studentId === studentId ? state : { user: null, loading: true, error: '' };
}
