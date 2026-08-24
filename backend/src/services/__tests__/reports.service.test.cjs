/**
 * Reporting, CSV export and efficiency analytics.
 *
 * The recurring risk here is a filter silently doing nothing — returning the
 * whole table when the Registrar asked for one month — so the tests assert the
 * filters actually reach the query.
 */
const reportModel = require('../../models/report.model');
const service = require('../reports.service');

const ADMIN = { id: 7, role: 'admin' };
const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };
const STUDENT = { id: 3, role: 'student' };

const statusOf = (p) => p.then(() => undefined, (e) => e.status);
const messageOf = (p) => p.then(() => '', (e) => e.message);

beforeEach(() => {
  vi.spyOn(reportModel, 'listDocumentsForReport').mockResolvedValue([]);
  vi.spyOn(reportModel, 'countDocumentsForReport').mockResolvedValue(0);
  vi.spyOn(reportModel, 'summariseDocuments').mockResolvedValue({
    total: '0', completed: '0', rejected: '0', paid: '0', revenue: '0',
  });
  vi.spyOn(reportModel, 'groupDocumentsBy').mockResolvedValue([]);
  vi.spyOn(reportModel, 'listStudentsForExport').mockResolvedValue([]);
  vi.spyOn(reportModel, 'turnaroundByDesk').mockResolvedValue([]);
  vi.spyOn(reportModel, 'endToEndCompletion').mockResolvedValue({
    completed_count: '0', avg_minutes: null, min_minutes: null, max_minutes: null,
  });
  vi.spyOn(reportModel, 'throughputByDay').mockResolvedValue([]);
  vi.spyOn(reportModel, 'workloadByClerk').mockResolvedValue([]);
});

describe('access control', () => {
  it.each([
    ['getDocumentReport', (u) => service.getDocumentReport(u, {})],
    ['exportStudentsCsv', (u) => service.exportStudentsCsv(u, 'all')],
    ['exportDocumentsCsv', (u) => service.exportDocumentsCsv(u, {})],
    ['getEfficiencyAnalytics', (u) => service.getEfficiencyAnalytics(u, {})],
  ])('%s rejects a student', async (_name, call) => {
    expect(await statusOf(call(STUDENT))).toBe(403);
  });

  it.each([
    ['getDocumentReport', (u) => service.getDocumentReport(u, {})],
    ['getEfficiencyAnalytics', (u) => service.getEfficiencyAnalytics(u, {})],
  ])('%s allows a clerk', async (_name, call) => {
    await expect(call(CLERK)).resolves.toBeTruthy();
  });
});

describe('document report filters', () => {
  it('passes every supplied filter through to the query', async () => {
    await service.getDocumentReport(ADMIN, {
      dateFrom: '2026-08-01', dateTo: '2026-08-31',
      status: 'completed', documentType: 'Diploma', paymentStatus: 'PAID',
    });
    expect(reportModel.listDocumentsForReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: '2026-08-01', dateTo: '2026-08-31',
        status: 'completed', documentType: 'Diploma', paymentStatus: 'PAID',
      }),
      expect.any(Object)
    );
  });

  it('filters the summary by exactly the same slice as the rows', async () => {
    await service.getDocumentReport(ADMIN, { status: 'completed' });
    const rowFilters = reportModel.listDocumentsForReport.mock.calls[0][0];
    const summaryFilters = reportModel.summariseDocuments.mock.calls[0][0];
    expect(summaryFilters).toEqual(rowFilters);
  });

  it.each([
    ['dateFrom', { dateFrom: 'not-a-date' }],
    ['dateTo', { dateTo: '31/08/2026' }],
  ])('rejects a malformed %s rather than returning everything', async (_l, query) => {
    expect(await statusOf(service.getDocumentReport(ADMIN, query))).toBe(400);
  });

  it('rejects an inverted date range', async () => {
    const msg = await messageOf(
      service.getDocumentReport(ADMIN, { dateFrom: '2026-09-01', dateTo: '2026-08-01' })
    );
    expect(msg).toMatch(/on or before/i);
  });

  it('coerces MySQL string aggregates into numbers for the UI', async () => {
    reportModel.summariseDocuments.mockResolvedValue({
      total: '10', completed: '4', rejected: '1', paid: '8', revenue: '1450.00',
    });
    const res = await service.getDocumentReport(ADMIN, {});
    expect(res.summary).toEqual({ total: 10, completed: 4, rejected: 1, paid: 8, revenue: 1450 });
  });

  it('clamps the page size so one request cannot pull the whole table', async () => {
    await service.getDocumentReport(ADMIN, { limit: '99999' });
    expect(reportModel.listDocumentsForReport.mock.calls[0][1].limit).toBe(1000);
  });

  it('normalises a nonsense page number to the first page', async () => {
    await service.getDocumentReport(ADMIN, { page: '-5' });
    expect(reportModel.listDocumentsForReport.mock.calls[0][1].offset).toBe(0);
  });

  it('computes the page count from the filtered total', async () => {
    reportModel.countDocumentsForReport.mockResolvedValue(250);
    const res = await service.getDocumentReport(ADMIN, { limit: '100' });
    expect(res).toMatchObject({ total: 250, totalPages: 3 });
  });
});

describe('student CSV export', () => {
  const STUDENTS = [
    { student_id: 'STU-001', full_name: 'Ana Reyes', course: 'CCS', enrollment_status: 'active', total_requests: 3 },
    { student_id: 'STU-002', full_name: 'Dela Cruz, Juan', course: 'CON', enrollment_status: 'active', total_requests: 1 },
  ];

  it.each(['active', 'alumni', 'others', 'all'])('supports the %s category', async (bucket) => {
    await service.exportStudentsCsv(ADMIN, bucket);
    expect(reportModel.listStudentsForExport).toHaveBeenCalledWith(bucket);
  });

  it('rejects an unknown category', async () => {
    const msg = await messageOf(service.exportStudentsCsv(ADMIN, 'everyone'));
    expect(msg).toMatch(/Unknown category/i);
  });

  it('names the file after the category and the date', async () => {
    const { filename } = await service.exportStudentsCsv(ADMIN, 'alumni');
    expect(filename).toMatch(/^students-alumni-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('emits a header row plus one row per student', async () => {
    reportModel.listStudentsForExport.mockResolvedValue(STUDENTS);
    const { csv, rowCount } = await service.exportStudentsCsv(ADMIN, 'active');
    const lines = csv.split('\r\n');
    expect(rowCount).toBe(2);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Student ID');
  });

  it('keeps columns aligned when a name contains a comma', async () => {
    reportModel.listStudentsForExport.mockResolvedValue(STUDENTS);
    const { csv } = await service.exportStudentsCsv(ADMIN, 'active');
    expect(csv).toContain('"Dela Cruz, Juan"');
  });

  it('produces a header-only file when nobody matches', async () => {
    const { csv, rowCount } = await service.exportStudentsCsv(ADMIN, 'others');
    expect(rowCount).toBe(0);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});

describe('document CSV export', () => {
  it('applies the same filters as the on-screen report', async () => {
    await service.exportDocumentsCsv(ADMIN, { status: 'completed', dateFrom: '2026-08-01' });
    expect(reportModel.listDocumentsForReport).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', dateFrom: '2026-08-01' }),
      expect.any(Object)
    );
  });

  it('caps the export rather than serialising the whole table', async () => {
    await service.exportDocumentsCsv(ADMIN, {});
    expect(reportModel.listDocumentsForReport.mock.calls[0][1].limit).toBe(10000);
  });

  it('validates dates before running the query', async () => {
    expect(await statusOf(service.exportDocumentsCsv(ADMIN, { dateFrom: 'garbage' }))).toBe(400);
    expect(reportModel.listDocumentsForReport).not.toHaveBeenCalled();
  });
});

describe('efficiency analytics', () => {
  it('labels raw pipeline statuses with readable desk names', async () => {
    reportModel.turnaroundByDesk.mockResolvedValue([
      { stage: 'pending_secretary', transitions: '4', avg_minutes: '638.75', max_minutes: '2491' },
    ]);
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.turnaround_by_desk[0]).toMatchObject({
      stage: 'pending_secretary',
      label: 'Secretary Evaluation',
      transitions: 4,
      avg_minutes: 639,
      avg_hours: 10.6,
    });
  });

  it('falls back to the raw stage name for an unmapped status', async () => {
    reportModel.turnaroundByDesk.mockResolvedValue([
      { stage: 'some_future_stage', transitions: '1', avg_minutes: '10', max_minutes: '10' },
    ]);
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.turnaround_by_desk[0].label).toBe('some_future_stage');
  });

  it('reports end-to-end completion in both minutes and hours', async () => {
    reportModel.endToEndCompletion.mockResolvedValue({
      completed_count: '5', avg_minutes: '614.6', min_minutes: '0', max_minutes: '2958',
    });
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.end_to_end).toMatchObject({ completed_count: 5, avg_minutes: 615, avg_hours: 10.2 });
  });

  it('survives an empty system without producing NaN', async () => {
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.end_to_end.avg_minutes).toBe(0);
    expect(res.end_to_end.avg_hours).toBe(0);
    expect(Number.isNaN(res.end_to_end.avg_minutes)).toBe(false);
  });

  it('normalises throughput dates to YYYY-MM-DD', async () => {
    reportModel.throughputByDay.mockResolvedValue([
      { date: new Date('2026-08-23T16:00:00Z'), completed: '3' },
    ]);
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.throughput[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.throughput[0].completed).toBe(3);
  });

  it('clamps the throughput window to a sane range', async () => {
    await service.getEfficiencyAnalytics(ADMIN, { days: '9999' });
    expect(reportModel.throughputByDay).toHaveBeenCalledWith({ days: 365 });
  });

  it('reports clerk workload as volume, not a score', async () => {
    reportModel.workloadByClerk.mockResolvedValue([
      { id: 13, full_name: 'Finance Officer', desk_assignment: 'Finance',
        documents_handled: '1953', actions_taken: '1953' },
    ]);
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.workload_by_clerk[0]).toEqual({
      id: 13, full_name: 'Finance Officer', desk_assignment: 'Finance',
      documents_handled: 1953, actions_taken: 1953,
    });
    // no ranking or rating is derived from these figures
    expect(Object.keys(res.workload_by_clerk[0])).not.toContain('score');
  });

  it('passes the date range to every analytics query', async () => {
    const range = { dateFrom: '2026-08-01', dateTo: '2026-08-31' };
    await service.getEfficiencyAnalytics(ADMIN, range);
    expect(reportModel.turnaroundByDesk).toHaveBeenCalledWith(range);
    expect(reportModel.workloadByClerk).toHaveBeenCalledWith(range);
  });
});
