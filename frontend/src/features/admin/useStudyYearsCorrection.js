import { useEffect, useRef, useState } from 'react';
import { correctStudyYears, lookupStudent } from '@/services/authService';
import { studyYearErrors } from '@/utils/profileYears';

export default function useStudyYearsCorrection(target, onSaved) {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({ year_started: '', graduation_year: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [staged, setStaged] = useState(null);
  const guard = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    lookupStudent(target.student_id).then(({ student }) => {
      if (cancelled) return;
      setProfile(student);
      setDraft({ year_started: String(student.year_started ?? ''), graduation_year: String(student.graduation_year ?? ''), reason: '' });
      setError('');
    }).catch(() => { if (!cancelled) setError('Could not load saved study years. Retry before making a correction.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [target.student_id, retry]);
  const stage = event => {
    event.preventDefault();
    const errors = studyYearErrors(draft, { required: profile?.user_type === 'alumni' });
    if (Object.keys(errors).length || !draft.reason.trim()) { setError(Object.values(errors)[0] || 'Record a correction reason.'); return; }
    setError(''); setStaged({ ...draft });
  };
  const confirm = async () => {
    if (!staged || guard.current) return;
    guard.current = true; setSaving(true); setError('');
    try { await correctStudyYears(target.id, staged); setStaged(null); onSaved(); }
    catch (failure) { setError(failure.response?.data?.error || 'Correction failed. Your draft is retained.'); }
    finally { guard.current = false; setSaving(false); }
  };
  return { profile, draft, setDraft, loading, saving, error, staged, stage, confirm,
    cancel: () => { if (!guard.current) setStaged(null); }, retry: () => { setLoading(true); setRetry(value => value + 1); } };
}
