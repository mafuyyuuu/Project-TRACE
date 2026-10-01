import { useEffect, useState } from 'react';
import { lookupStudent } from '@/services/authService';

export default function useStudentProfile(open, studentId) {
  const [state, setState] = useState({ requestKey: null, user: null, loading: false, error: '' });
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${studentId}:${attempt}`;
  useEffect(() => {
    if (!open || !studentId) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => {
      if (!current) return;
      current = false;
      setState({ requestKey, user: null, loading: false, error: 'Profile loading timed out. Check your connection and retry.' });
      controller.abort();
    }, 15000);
    lookupStudent(studentId, { signal: controller.signal, timeout: 15000 }).then(result => {
      if (!result?.student || typeof result.student !== 'object' || String(result.student.student_id) !== String(studentId)) {
        throw new Error('Invalid profile response');
      }
      if (current) setState({ requestKey, user: result.student, loading: false, error: '' });
    }).catch(err => {
      if (current) setState({ requestKey, user: null, loading: false, error: err.response?.data?.error || 'Could not load this profile. Please retry.' });
    }).finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [open, studentId, requestKey]);
  const retry = () => setAttempt(value => value + 1);
  if (!open) return { user: null, loading: false, error: '', retry };
  if (!studentId) return { user: null, loading: false, error: 'This record has no student ID. Close this profile and select an identified student.', retry };
  return { ...(state.requestKey === requestKey ? state : { user: null, loading: true, error: '' }), retry };
}
