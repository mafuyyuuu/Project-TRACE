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
        <button type="button" onClick={retry} className="rounded-xl bg-[#15803d] px-4 py-2 text-white font-bold">Retry loading profile</button>
      </div> : <p role="status">Loading profile…</p>}
    </ModalShell>
  );
  return <UserDetailModal open={open} onClose={onClose} user={user} />;
}
