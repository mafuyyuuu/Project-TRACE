import { authStorage } from '@/utils/authStorage';
import { useRef, useState } from 'react';
import { updateProfile } from '@/services/authService';
import { disconnectRealtime } from '@/services/realtimeService';
export default function useForcePasswordChange(onChanged) {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async payload => {
    if (!payload || busy.current) return false;
    busy.current = true; setSaving(true); setError('');
    const token = authStorage.getItem('trace_token');
    try {
      const result = await updateProfile(payload);
      if (authStorage.getItem('trace_token') !== token) return false;
      if (!result?.token || !result?.user) throw new Error('Password changed but the replacement session is missing. Sign in again with your new password.');
      authStorage.setItem('trace_token', result.token);
      authStorage.setItem('trace_user', JSON.stringify(result.user));
      disconnectRealtime();
      window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: result.user }));
      onChanged();
      return true;
    } catch (err) { setError(err.response?.data?.error || err.message || 'Could not update your password. Please try again.'); return false; }
    finally { busy.current = false; setSaving(false); }
  };
  return { save, saving, error };
}
