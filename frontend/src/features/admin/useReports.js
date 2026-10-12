import useViewportPagination from '@/hooks/useViewportPagination';
import { EMPTY_REPORT_FILTERS } from '@/utils/reportFilters';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDocumentReport,
  getAnalytics,
  exportStudentsCsv,
  exportDocumentsCsv,
} from '@/services/reportsService';

const EMPTY_FILTERS = EMPTY_REPORT_FILTERS;

/**
 * Reporting and efficiency analytics for the Registrar.
 *
 * Filters are held here and applied to the report, the CSV export and the
 * analytics alike, so what's exported always matches what's on screen.
 */
export default function useReports(user, currentTab, initialRecordSet = '') {
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, recordSet: initialRecordSet }));
  const [reportResult, setReportResult] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [settledScope, setSettledScope] = useState(null);
  const loadSequence = useRef(0);
  const [exporting, setExporting] = useState('');
  const exportPending = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dismissNotification = useCallback(() => {
    setSuccess('');
    setError('');
  }, []);

  const isActive = (user?.role === 'admin' && ['admin-reports', 'admin-analytics'].includes(currentTab)) ||
    (user?.role === 'clerk' && ['Window 1', 'Receiving Desk', 'Secretary'].includes(user.desk_assignment) && currentTab === 'reports');

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
          currentTab === 'admin-analytics' ? getAnalytics(nextFilters) : Promise.resolve(null),
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
    [page, filters, pagination.pageSize, currentTab]
  );

  useEffect(() => {
    if (isActive) load();
    return () => { loadSequence.current += 1; };
  }, [isActive, load]);

  const applyFilters = useCallback(next => {
    setSettledScope(null); setError(''); setPage(1); setFilters({...EMPTY_FILTERS,...next});
  }, []);

  const goToPage = useCallback(
    (nextPage) => {
      setSettledScope(null);
      setPage(nextPage);
    },
    []
  );

  /**
   * @param {'active'|'alumni'|'others'|'all'} category
   */
  const downloadStudents = useCallback(
    async (category) => {
      if(exportPending.current || !report || refreshing) return;
      exportPending.current=true; setExporting(category);
      try {
        const filename = await exportStudentsCsv(category, activeFilters);
        setSuccess(`Exported ${filename}`);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Export failed.');
        setSuccess('');
      } finally {
        exportPending.current=false; setExporting('');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters,report,refreshing]
  );

  const downloadDocuments = useCallback(async () => {
    if (!report || refreshing) {
      setError('Wait for the current report to load before exporting. Apply Filters to retry if loading failed.');
      return;
    }
    if(exportPending.current) return;
    exportPending.current=true; setExporting('documents');
    try {
      const filename = await exportDocumentsCsv(activeFilters);
      setSuccess(`Exported ${filename}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Export failed.');
      setSuccess('');
    } finally {
      exportPending.current=false; setExporting('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, report, refreshing]);

  return {
    tableRef: pagination.containerRef,
    filters, applyFilters,
    report, analytics, page, goToPage,
    loading, refreshing, exporting, error, success,
    dismissNotification,
    downloadStudents, downloadDocuments,
  };
}
