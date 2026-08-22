/**
 * Guards the fix for the "uploaded files were world-readable" vulnerability:
 * student ID photos and GCash receipts must only be reachable by staff or the
 * owning student, and filenames must never escape the uploads directory.
 */
const documentModel = require('../../models/document.model');
const userModel = require('../../models/user.model');
const { getFilePathForUser, resolveSafePath } = require('../files.service');

const STAFF = { id: 1, role: 'clerk', desk_assignment: 'Finance' };
const ADMIN = { id: 2, role: 'admin' };
const STUDENT = { id: 3, role: 'student' };

/**
 * The fixtures reference files that do not exist on disk, so an *authorized*
 * caller fails later with 404 while a *denied* caller fails first with 403.
 * Asserting on the status distinguishes the two without touching the filesystem.
 */
const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

beforeEach(() => {
  vi.spyOn(documentModel, 'findByAttachedFilename').mockResolvedValue([]);
  vi.spyOn(userModel, 'findStudentIdById').mockResolvedValue([{ student_id: 'STU-001' }]);
  vi.spyOn(userModel, 'findByIdProofFilename').mockResolvedValue([]);
});

describe('resolveSafePath — path traversal defence', () => {
  it.each([
    '../../.env',
    '../../../etc/passwd',
    'subdir/../../secret.txt',
    '/etc/passwd',
  ])('reduces %s to a bare filename inside uploads/', (attack) => {
    const { filename, fullPath } = resolveSafePath(attack);
    expect(filename).not.toContain('..');
    expect(filename).not.toContain('/');
    expect(fullPath).toContain('uploads');
    expect(fullPath).not.toContain('/etc/');
  });

  it.each([['empty', ''], ['null', null], ['undefined', undefined], ['dot', '.'], ['dotdot', '..']])(
    'rejects %s outright',
    (_label, bad) => {
      expect(() => resolveSafePath(bad)).toThrow();
    }
  );

  it('leaves an ordinary upload filename untouched', () => {
    expect(resolveSafePath('1783740970418-f53ee658.jpg').filename).toBe('1783740970418-f53ee658.jpg');
  });
});

describe('file authorization', () => {
  it('lets a clerk read any file', async () => {
    expect(await statusOf(getFilePathForUser(STAFF, 'someone-elses.jpg'))).not.toBe(403);
  });

  it('lets an admin read any file', async () => {
    expect(await statusOf(getFilePathForUser(ADMIN, 'someone-elses.jpg'))).not.toBe(403);
  });

  it("denies a student another student's document file", async () => {
    documentModel.findByAttachedFilename.mockResolvedValue([{ id: 9, student_id: 'STU-999' }]);
    expect(await statusOf(getFilePathForUser(STUDENT, 'other-receipt.jpg'))).toBe(403);
  });

  it('denies a student a file attached to no document at all', async () => {
    expect(await statusOf(getFilePathForUser(STUDENT, 'orphan.jpg'))).toBe(403);
  });

  it('allows a student a file attached to their own document', async () => {
    documentModel.findByAttachedFilename.mockResolvedValue([{ id: 5, student_id: 'STU-001' }]);
    expect(await statusOf(getFilePathForUser(STUDENT, 'my-receipt.jpg'))).not.toBe(403);
  });

  it('allows a student their own registration ID proof', async () => {
    userModel.findByIdProofFilename.mockResolvedValue([{ id: 3, student_id: 'STU-001' }]);
    expect(await statusOf(getFilePathForUser(STUDENT, 'proof-mine.jpg'))).not.toBe(403);
  });

  it("denies a student another student's ID proof", async () => {
    userModel.findByIdProofFilename.mockResolvedValue([{ id: 77, student_id: 'STU-999' }]);
    expect(await statusOf(getFilePathForUser(STUDENT, 'proof-theirs.jpg'))).toBe(403);
  });

  it('denies a student with no student_id on record', async () => {
    userModel.findStudentIdById.mockResolvedValue([]);
    expect(await statusOf(getFilePathForUser(STUDENT, 'anything.jpg'))).toBe(403);
  });
});
