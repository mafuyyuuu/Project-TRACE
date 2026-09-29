import { useState, useEffect } from 'react';
import api from '@/services/api';
import UserDetailModal from '@/features/admin/components/UserDetailModal';

export default function StudentProfileModal({ open, onClose, studentId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && studentId) {
      setLoading(true);
      api.get(`/auth/student/${studentId}`)
        .then((res) => setUser(res.data.student))
        .catch((err) => console.error('Failed to load student profile', err))
        .finally(() => setLoading(false));
    } else {
      setUser(null);
    }
  }, [open, studentId]);

  if (!open) return null;

  return (
    <UserDetailModal
      open={open}
      onClose={onClose}
      user={user || { student_id: studentId, full_name: 'Loading...' }}
    />
  );
}
