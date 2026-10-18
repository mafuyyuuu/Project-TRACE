import useDataRefresh from '@/hooks/useDataRefresh';
import useAcademicReferences from '@/hooks/useAcademicReferences';
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
 * Fetch configurable questions and resolve academic fields from the shared
 * Registrar catalog. Keep the draft independent of background refreshes.
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
  const hasAcademicFields = fields.some(field => field.catalog === 'programs');
  const academic = useAcademicReferences(Boolean(user) && hasAcademicFields);
  const selectedCollege = academic.colleges.find(college => college.name === answers.college);
  const programs = academic.programs.filter(program => String(program.college_id) === String(selectedCollege?.id));

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
    setAnswers((current) => ({ ...current, [fieldKey]: value, ...(fieldKey === 'college' && current.college !== value ? { program: '' } : {}) }));
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
      if (hasAcademicFields && (academic.loading || academic.error)) {
        setError('Load the College and Degree Program choices before submitting.');
        return;
      }
      if (hasAcademicFields && (answers.college || answers.program)
        && (!selectedCollege || !programs.some(program => program.name === answers.program))) {
        setError('Choose a Degree Program belonging to the selected College.');
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
    [answers, missingRequired, fields, hasAcademicFields, academic.loading, academic.error, selectedCollege, programs]
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
        try {
          const mine = await getMyApplications();
          if (authStorage.getItem('trace_token') !== token) return;
          setApplications(mine.applications || []);
        } catch {
          if (authStorage.getItem('trace_token') !== token) return;
          setSuccess(`${res.message || 'Application submitted.'} Refresh to update application history.`);
        }
        try {
          const { user: fresh } = await getMe();
          if (authStorage.getItem('trace_token') !== token) return;
          authStorage.setItem('trace_user', JSON.stringify(fresh));
          window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: fresh }));
        } catch {
          if (authStorage.getItem('trace_token') !== token) return;
          // The application is already saved; a failed refresh is not a failed submission.
          setSuccess(`${res.message || 'Application submitted.'} Refresh the page to update dashboard access.`);
        }
      } catch (err) {
        if (authStorage.getItem('trace_token') !== token) return;
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
    academic: { ...academic, programs, selectedCollege, enabled: hasAcademicFields },
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
