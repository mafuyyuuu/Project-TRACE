import Button from '@/components/Button';
import useStudentProfile from '@/hooks/useStudentProfile';
import ModalShell from '@/components/ModalShell';
import UserDetailModal from '@/features/admin/components/UserDetailModal';

export default function StudentProfileModal({ open, onClose, studentId }) {
  const { user, loading, error, retry } = useStudentProfile(open, studentId);
  if (!open) return null;
  if (loading || error || !user) return (
    <ModalShell open title="Student Profile" onClose={onClose} maxWidth="max-w-lg">
      {error ? <div className="space-y-4">
        <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>
        <Button type="button" onClick={retry} className="trace-button trace-button-primary">Retry loading profile</Button>
      </div> : <p role="status">Loading profile…</p>}
    </ModalShell>
  );
  return <UserDetailModal open={open} onClose={onClose} user={user} />;
}
