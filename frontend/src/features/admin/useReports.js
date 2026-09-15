import { useState, useEffect, useCallback } from 'react';
import {
  getDocumentReport,
  getAnalytics,
  exportStudentsCsv,
  exportDocumentsCsv,
} from '@/services/reportsService';

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  status: '',
  documentType: '',
  paymentStatus: '',
};

/**
 * Reporting and efficiency analytics for the Registrar.
 *
 * Filters are held here and applied to the report, the CSV export and the
 * analytics alike, so what's exported always matches what's on screen.
 */
export default function useReports(user, currentTab) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isActive = user?.role === 'admin' && (currentTab === 'admin-reports' || currentTab === 'admin-analytics');

  /** Strip blanks so an untouched filter isn't sent as an empty string. */
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));

  const load = useCallback(
    async (nextPage = page, nextFilters = activeFilters) => {
      try {
        const [r, a] = await Promise.allSettled([
          getDocumentReport({ ...nextFilters, page: nextPage, limit: 25 }),
          getAnalytics(nextFilters),
        ]);

        if (r.status === 'fulfilled') setReport(r.value);
        else setError(r.reason?.response?.data?.error || 'Failed to generate report.');

        if (a.status === 'fulfilled') setAnalytics(a.value);
      } finally {
        setLoading(false);
      }
    },
    // activeFilters is derived from `filters`, which is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, filters]
  );

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const applyFilters = useCallback(() => {
    setError('');
    setPage(1);
    load(1);
  }, [load]);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setError('');
    load(1, {});
  }, [load]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const goToPage = useCallback(
    (nextPage) => {
      setPage(nextPage);
      load(nextPage);
    },
    [load]
  );

  /**
   * @param {'active'|'alumni'|'others'|'all'} category
   */
  const downloadStudents = useCallback(
    async (category) => {
      setExporting(category);
      try {
        const filename = await exportStudentsCsv(category);
        setSuccess(`Exported ${filename}`);
        setTimeout(() => setSuccess(''), 4000);
      } catch {
        setError('Export failed.');
        setTimeout(() => setError(''), 4000);
      } finally {
        setExporting('');
      }
    },
    []
  );

  const downloadDocuments = useCallback(async () => {
    setExporting('documents');
    try {
      const filename = await exportDocumentsCsv(activeFilters);
      setSuccess(`Exported ${filename}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Export failed.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setExporting('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    filters, updateFilter, applyFilters, resetFilters,
    report, analytics, page, goToPage,
    loading, exporting, error, success,
    downloadStudents, downloadDocuments,
  };
}
