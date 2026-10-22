/**
 * Reporting, CSV export and efficiency analytics.
 *
 * The recurring risk here is a filter silently doing nothing — returning the
 * whole table when the Registrar asked for one month — so the tests assert the
 * filters actually reach the query.
 */
const referenceModel = require('../../models/referenceData.model');
const reportModel = require('../../models/report.model');
const userModel = require('../../models/user.model');
const service = require('../reports.service');

const ADMIN = { id: 7, role: 'admin' };
const CLERK = { id: 4, role: 'clerk', desk_assignment: 'Finance' };
const STUDENT = { id: 3, role: 'student' };

const statusOf = (p) => p.then(() => undefined, (e) => e.status);
const messageOf = (p) => p.then(() => '', (e) => e.message);

beforeEach(() => {
  vi.spyOn(reportModel,'activeDelayCases').mockResolvedValue([]);
  vi.spyOn(reportModel,'deskWaitBaselines').mockResolvedValue([]);
  vi.spyOn(require('../aiEngine.service'),'getDocumentAnalytics').mockResolvedValue(null);
  vi.spyOn(referenceModel,'findCollegeById').mockResolvedValue([{id:4,name:'College Four',is_active:1}]);
  vi.spyOn(referenceModel,'findDocumentTypeByName').mockResolvedValue([{name:'Diploma'}]);
  vi.spyOn(userModel, 'findCourseById').mockResolvedValue([{ college_id: 4, course: 'College Four' }]);
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

describe('Secretary records workspace', () => {
  const secretary = { id: 8, role: 'clerk', desk_assignment: 'Secretary' };
  it('uses the assigned college and Ready + Completed for list, KPI and filtered CSV', async () => {
    const query = { recordSet: 'secretary-cleared', dateFrom: '2026-10-01', paymentStatus: 'PAID', collegeId: 4 };
    await service.getDocumentReport(secretary, query);
    await service.exportDocumentsCsv(secretary, query);
    const filters = reportModel.listDocumentsForReport.mock.calls[0][0];
    expect(filters).toEqual(expect.objectContaining({ collegeId: 4, collegeName: 'College Four', statuses: ['READY_FOR_RELEASE', 'COMPLETED'], dateFrom: '2026-10-01', paymentStatus: 'PAID' }));
    expect(reportModel.listDocumentsForReport.mock.calls[1][0]).toEqual(filters);
    expect(reportModel.countDocumentsForReport).toHaveBeenCalledWith(filters);
    expect(reportModel.summariseDocuments).toHaveBeenCalledWith(filters);
    expect(reportModel.groupDocumentsBy).toHaveBeenCalledWith('current_status', filters);
  });
  it('preserves document request labels in Secretary exports and scopes all student categories', async () => {
    reportModel.listDocumentsForReport.mockResolvedValue([{ document_sequence_number: 'Diploma – Request No. 2' }]);
    const result = await service.exportDocumentsCsv(secretary, { status: 'COMPLETED' });
    expect(result.csv).toContain('Document Request');
    expect(result.csv).toContain('Diploma – Request No. 2');
    for (const bucket of ['active', 'alumni', 'others', 'all']) {
      await service.exportStudentsCsv(secretary, bucket);
      expect(reportModel.listStudentsForExport).toHaveBeenLastCalledWith(bucket, undefined, { collegeId: 4, collegeName: 'College Four' });
    }
  });
  it('fails closed when the Secretary has no college assignment', async () => {
    userModel.findCourseById.mockResolvedValue([]);
    for (const call of [() => service.getDocumentReport(secretary), () => service.exportDocumentsCsv(secretary), () => service.exportStudentsCsv(secretary)]) expect(await statusOf(call())).toBe(403);
    expect(reportModel.listDocumentsForReport).not.toHaveBeenCalled();
    expect(reportModel.listStudentsForExport).not.toHaveBeenCalled();
  });
  it('keeps legacy course assignments scoped and other roles unchanged', async () => {
    userModel.findCourseById.mockResolvedValue([{ course: 'Legacy College' }]);
    await service.getDocumentReport(secretary);
    expect(reportModel.listDocumentsForReport).toHaveBeenLastCalledWith(expect.objectContaining({ collegeId: null, collegeName: 'Legacy College' }), expect.any(Object));
    await service.getDocumentReport(ADMIN);
    expect(reportModel.listDocumentsForReport.mock.calls.at(-1)[0]).not.toHaveProperty('collegeId');
  });
  it('rejects unknown or conflicting record presets', async () => {
    expect(await statusOf(service.getDocumentReport(secretary, { recordSet: 'invalid' }))).toBe(400);
    expect(await statusOf(service.exportDocumentsCsv(secretary, { recordSet: 'secretary-cleared', status: 'COMPLETED' }))).toBe(400);
  });
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
      status: 'COMPLETED', documentType: 'Diploma', paymentStatus: 'PAID',
    });
    expect(reportModel.listDocumentsForReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: '2026-08-01', dateTo: '2026-08-31',
        status: 'COMPLETED', documentType: 'Diploma', paymentStatus: 'PAID',
      }),
      expect.any(Object)
    );
  });

  it('filters the summary by exactly the same slice as the rows', async () => {
    await service.getDocumentReport(ADMIN, { status: 'COMPLETED' });
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
  it('exports equivalent phone formats as local text and preserves invalid historical data', async () => {
    reportModel.listStudentsForExport.mockResolvedValue([
      { phone_number: '+639123456789' }, { phone_number: '09123456789' }, { phone_number: 'legacy-value' },
    ]);
    const { csv } = await service.exportStudentsCsv(ADMIN, 'all');
    expect(csv.match(/'09123456789/g)).toHaveLength(2);
    expect(csv).toContain("'legacy-value");
    expect(csv).not.toContain('+639123456789');
  });
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
    await service.exportDocumentsCsv(ADMIN, { status: 'COMPLETED', dateFrom: '2026-08-01' });
    expect(reportModel.listDocumentsForReport).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED', dateFrom: '2026-08-01' }),
      expect.any(Object)
    );
  });

  it('caps the export rather than serialising the whole table', async () => {
    await service.exportDocumentsCsv(ADMIN, {});
    expect(reportModel.listDocumentsForReport.mock.calls[0][1].limit).toBe(10001);
  });

  it('validates dates before running the query', async () => {
    expect(await statusOf(service.exportDocumentsCsv(ADMIN, { dateFrom: 'garbage' }))).toBe(400);
    expect(reportModel.listDocumentsForReport).not.toHaveBeenCalled();
  });
});

describe('efficiency analytics', () => {
  it('labels raw pipeline statuses with readable desk names', async () => {
    reportModel.turnaroundByDesk.mockResolvedValue([
      { stage: 'PENDING_SEC_EVALUATION', transitions: '4', avg_minutes: '638.75', max_minutes: '2491' },
    ]);
    const res = await service.getEfficiencyAnalytics(ADMIN, {});
    expect(res.turnaround_by_desk[0]).toMatchObject({
      stage: 'PENDING_SEC_EVALUATION',
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
    expect(reportModel.throughputByDay).toHaveBeenCalledWith({days:30,...range});
    expect(reportModel.workloadByClerk).toHaveBeenCalledWith(range);
  });

  it.each([1, 2, 3])('preserves the complete workload dataset when document report page is %s', async page => {
    const rows = [60, 30, 10].map((documents_handled, id) => ({ id, documents_handled: String(documents_handled) }));
    reportModel.workloadByClerk.mockResolvedValue(rows);
    const range = { dateFrom: '2026-10-01', dateTo: '2026-10-05' };
    const res = await service.getEfficiencyAnalytics(ADMIN, { ...range, page, limit: 1 });
    expect(reportModel.workloadByClerk).toHaveBeenCalledWith(range);
    expect(res.workload_by_clerk.map(row => row.documents_handled)).toEqual([60, 30, 10]);
  });
});

it('sends only loaded report aggregates to the AI engine and exposes validated advice',async()=>{
  const ai=require('../aiEngine.service');
  reportModel.endToEndCompletion.mockResolvedValue({completed_count:5,avg_minutes:20,min_minutes:2,max_minutes:40});
  reportModel.workloadByClerk.mockResolvedValue([{id:9,full_name:'PRIVATE NAME',desk_assignment:'Finance',documents_handled:2,actions_taken:3}]);
  ai.getDocumentAnalytics.mockResolvedValue({source:'aggregate_rules',insights:[{type:'info',title:'Measured history',message:'Five recorded completions.',method:'aggregate_rules',sample_size:5}]});
  const result=await service.getEfficiencyAnalytics(ADMIN,{dateFrom:'2026-10-01',dateTo:'2026-10-17'});
  expect(result.analysis.source).toBe('ai_engine_aggregate_rules');
  const [payload]=ai.getDocumentAnalytics.mock.calls[0];
  expect(payload.end_to_end.completed_count).toBe(5);
  expect(payload.range).toMatchObject({dateFrom:'2026-10-01',dateTo:'2026-10-17'});
  expect(JSON.stringify(payload)).not.toMatch(/PRIVATE NAME|full_name|student_id|email|clerk_id/);
});
it('keeps measured analytics when AI is unavailable or malformed',async()=>{
 const ai=require('../aiEngine.service');
 for(const response of [null,{source:'made_up',insights:[]},{source:'aggregate_rules',insights:[{method:'aggregate_rules',sample_size:-1}]}]){
  ai.getDocumentAnalytics.mockResolvedValue(response);
  const result=await service.getEfficiencyAnalytics(ADMIN);
  expect(result.analysis.source).toBe('unavailable');
  expect(result).toHaveProperty('end_to_end');
 }
});
