import { useState, useEffect, useCallback } from 'react';
import {
  getFormFields,
  submitApplication,
  getMyApplications,
} from '@/services/gradService';

/**
 * Graduate Application module.
 *
 * The Registrar hasn't finalised the questions, so nothing here knows what the
 * fields are: the form definition is fetched and rendered generically. Adding a
 * field is a data change in the Maintenance module, not a code change.
 */
export default function useGraduateApplication(user) {
  const [fields, setFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [fieldData, mine] = await Promise.allSettled([getFormFields(), getMyApplications()]);

      if (fieldData.status === 'fulfilled') {
        setFields(fieldData.value.fields || []);
      } else {
        setError('Could not load the application form.');
      }
      if (mine.status === 'fulfilled') {
        setApplications(mine.value.applications || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const updateAnswer = useCallback((fieldKey, value) => {
    setAnswers((current) => ({ ...current, [fieldKey]: value }));
  }, []);

  /**
   * Client-side required check purely for fast feedback — the server validates
   * against the same definitions and is the authority.
   */
  const missingRequired = fields
    .filter((f) => f.is_required)
    .filter((f) => {
      const v = answers[f.field_key];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.label);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (missingRequired.length) {
        setError(`Please complete: ${missingRequired.join(', ')}.`);
        return;
      }

      setSubmitting(true);
      try {
        const res = await submitApplication(answers);
        setSuccess(res.message || 'Application submitted.');
        setAnswers({});
        const mine = await getMyApplications();
        setApplications(mine.applications || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to submit application.');
      } finally {
        setSubmitting(false);
      }
    },
    [answers, missingRequired]
  );

  return {
    fields,
    answers,
    applications,
    loading,
    submitting,
    error,
    success,
    updateAnswer,
    handleSubmit,
    reload: load,
  };
}
