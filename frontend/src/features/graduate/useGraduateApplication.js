import useDataRefresh from '@/hooks/useDataRefresh';
import { authStorage } from '@/utils/authStorage';
import { yearError } from '@/utils/profileYears';
import { normalizePhoneNumber, phoneNumberError } from '@/utils/phoneNumber';
import { getMe } from '@/services/authService';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [answersToConfirm, setAnswersToConfirm] = useState(null);

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

  useDataRefresh(["graduate", "profile"], load, Boolean(user));

  const updateAnswer = useCallback((fieldKey, value) => {
    setAnswers((current) => ({ ...current, [fieldKey]: value }));
  }, []);

  const dismissNotification = useCallback(() => {
    setError('');
    setSuccess('');
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

      const graduation = fields.find(field => field.field_key === 'year_graduated');
      const problem = graduation && yearError(answers.year_graduated, { label: graduation.label, minimum: 2002, required: Boolean(graduation.is_required) });
      if (problem) { setError(problem); return; }
      const draft = { ...answers };
      for (const field of fields.filter(field => field.field_type === 'tel')) {
        const value = answers[field.field_key] || '';
        const phoneError = phoneNumberError(value, { required: Boolean(field.is_required) });
        if (phoneError) { setError(`${field.label}: ${phoneError}`); return; }
        draft[field.field_key] = normalizePhoneNumber(value) || '';
      }
      setAnswersToConfirm(draft);
    },
    [answers, missingRequired, fields]
  );

  const submissionPending = useRef(false);
  const confirmSubmission = useCallback(async () => {
    if (!answersToConfirm || submissionPending.current) return;
    submissionPending.current = true;
    const token = authStorage.getItem('trace_token');
      setSubmitting(true);
      try {
        const res = await submitApplication(answersToConfirm);
        if (authStorage.getItem('trace_token') !== token) return;
        setSuccess(res.message || 'Application submitted.');
        setAnswers({});
        setAnswersToConfirm(null);
        const mine = await getMyApplications();
        if (authStorage.getItem('trace_token') !== token) return;
        setApplications(mine.applications || []);
        try {
          const { user: fresh } = await getMe();
          if (authStorage.getItem('trace_token') !== token) return;
          authStorage.setItem('trace_user', JSON.stringify(fresh));
          window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: fresh }));
        } catch {
          // The application is already saved; a failed refresh is not a failed submission.
          setSuccess(`${res.message || 'Application submitted.'} Refresh the page to update dashboard access.`);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to submit application.');
      } finally {
        submissionPending.current = false;
        setSubmitting(false);
      }
  }, [answersToConfirm]);

  return {
    answersToConfirm,
    confirmSubmission,
    cancelSubmission: () => setAnswersToConfirm(null),
    fields,
    answers,
    applications,
    loading,
    submitting,
    error,
    success,
    dismissNotification,
    updateAnswer,
    handleSubmit,
    reload: load,
  };
}
