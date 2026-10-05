import Button from '@/components/Button';
import useAcademicReferences from '@/hooks/useAcademicReferences';

export default function AcademicProfileFields({ user, profileData, setField, busy }) {
  const { colleges, programs, loading, error, retry } = useAcademicReferences(true);
  const collegeId = String(profileData.college_id || '');
  const program = profileData.program || '';
  const options = programs.filter(item => String(item.college_id) === collegeId);
  const changed = collegeId !== String(user.college_id || '') || program !== (user.program || '');
  const legacyCollege = collegeId && !colleges.some(item => String(item.id) === collegeId);
  const legacyProgram = program && !options.some(item => item.name === program);
  return (
    <div className="trace-form-grid">
      <label className="trace-label block">College
        <select className="trace-control w-full mt-1" value={collegeId} onChange={event => setField('college_id', event.target.value)} disabled={busy || loading || !!error} required={changed}>
          <option value="">{user.course && !collegeId ? `Recorded: ${user.course} — choose a college to update` : 'Choose College'}</option>
          {legacyCollege && <option value={collegeId}>Recorded: {user.course || 'College unavailable'}</option>}
          {colleges.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="trace-label block">Program/Course
        <select className="trace-control w-full mt-1" value={program} onChange={event => setField('program', event.target.value)} disabled={busy || loading || !!error || !collegeId || legacyCollege} required={changed} aria-describedby="academic-reference-help">
          <option value="">Choose Program/Course</option>
          {legacyProgram && <option value={program} disabled={changed}>Recorded: {program} (not in the active catalog)</option>}
          {options.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      <div className="col-span-full text-sm text-gray-600 dark:text-gray-300" id="academic-reference-help">
        {loading ? <p role="status">Loading College and Program choices…</p> : error ? <><p role="alert">{error}</p><Button className="trace-button-secondary mt-2" onClick={retry} disabled={busy}>Retry Choices</Button></> : <>
          <p>Choose College first, then its Registrar-approved Program/Course. Changing College clears the program selection.</p>
          {collegeId && !options.length && <p className="mt-1">No active programs are available for this college. Ask Admin to add the Registrar-approved program before changing these selections.</p>}
          {(legacyProgram || legacyCollege || (!collegeId && user.course)) && <p className="mt-1">Your recorded academic details stay saved until you choose a valid replacement. You can still save other profile fields.</p>}
        </>}
      </div>
    </div>
  );
}
