import useViewportPagination from '@/hooks/useViewportPagination';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [reportResult, setReportResult] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [settledScope, setSettledScope] = useState(null);
  const loadSequence = useRef(0);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dismissNotification = useCallback(() => {
    setSuccess('');
    setError('');
  }, []);

  const isActive = (user?.role === 'admin' && ['admin-reports', 'admin-analytics'].includes(currentTab)) ||
    (user?.role === 'clerk' && ['Window 1', 'Secretary'].includes(user.desk_assignment) && currentTab === 'reports');

  const pagination = useViewportPagination({ page, setPage, total: reportResult?.data?.total || 0, fallback: 25, enabled: isActive });

  /** Strip blanks so an untouched filter isn't sent as an empty string. */
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const scopeKey = JSON.stringify({ filters: activeFilters, page, limit: pagination.pageSize });
  const report = reportResult?.scopeKey === scopeKey ? reportResult.data : null;
  const refreshing = isActive && settledScope !== scopeKey;

  const load = useCallback(
    async (nextPage = page, nextFilters = activeFilters) => {
      const sequence = ++loadSequence.current;
      const requestedScope = JSON.stringify({ filters: nextFilters, page: nextPage, limit: pagination.pageSize });
      try {
        const [r, a] = await Promise.allSettled([
          getDocumentReport({ ...nextFilters, page: nextPage, limit: pagination.pageSize }),
          getAnalytics(nextFilters),
        ]);

        if (sequence !== loadSequence.current) return;
        if (r.status === 'fulfilled') {
          setReportResult({ data: r.value, scopeKey: requestedScope });
        } else {
          setReportResult(null);
          setError(r.reason?.response?.data?.error || 'Failed to generate report.');
        }

        if (a.status === 'fulfilled') setAnalytics(a.value);
      } finally {
        if (sequence === loadSequence.current) { setLoading(false); setSettledScope(requestedScope); }
      }
    },
    // activeFilters is derived from `filters`, which is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, filters, pagination.pageSize]
  );

  useEffect(() => {
    if (isActive) load();
    return () => { loadSequence.current += 1; };
  }, [isActive, load]);

  const applyFilters = useCallback(() => {
    setSettledScope(null);
    setError('');
    setPage(1);
    load(1);
  }, [load]);

  const resetFilters = useCallback(() => {
    setSettledScope(null);
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
      setSettledScope(null);
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
        setError('');
      } catch {
        setError('Export failed.');
        setSuccess('');
      } finally {
        setExporting('');
      }
    },
    []
  );

  const downloadDocuments = useCallback(async () => {
    if (!report || refreshing) {
      setError('Wait for the current report to load before exporting. Apply Filters to retry if loading failed.');
      return;
    }
    setExporting('documents');
    try {
      const filename = await exportDocumentsCsv(activeFilters);
      setSuccess(`Exported ${filename}`);
      setError('');
    } catch {
      setError('Export failed.');
      setSuccess('');
    } finally {
      setExporting('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, report, refreshing]);

  return {
    tableRef: pagination.containerRef,
    filters, updateFilter, applyFilters, resetFilters,
    report, analytics, page, goToPage,
    loading, refreshing, exporting, error, success,
    dismissNotification,
    downloadStudents, downloadDocuments,
  };
}
