import { useEffect, useState } from 'react';
import { getColleges, getPrograms } from '@/services/referenceService';

export default function useAcademicReferences(enabled) {
  const [state, setState] = useState({ colleges: [], programs: [], loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const controller = new AbortController();
    Promise.all([getColleges({ signal: controller.signal, timeout: 15000 }), getPrograms({ signal: controller.signal, timeout: 15000 })])
      .then(([collegeData, programData]) => {
        if (!Array.isArray(collegeData?.colleges) || !Array.isArray(programData?.programs)) throw new Error('Invalid reference response');
        if (live) setState({ colleges: collegeData.colleges, programs: programData.programs, loading: false, error: '' });
      }).catch(() => {
        if (live) setState(previous => ({ ...previous, loading: false, error: 'College and Program choices could not be loaded. Retry or contact the Registrar. Your saved entries are preserved.' }));
      });
    return () => { live = false; controller.abort(); };
  }, [enabled, revision]);
  return { ...state, retry: () => { setState(previous => ({ ...previous, loading: true, error: '' })); setRevision(value => value + 1); } };
}
