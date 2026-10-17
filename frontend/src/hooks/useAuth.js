import { readCachedUser, authStorage } from '@/utils/authStorage';
import { useState, useEffect, useRef, useCallback } from 'react';
import useDataRefresh from '@/hooks/useDataRefresh';
import { disconnectRealtime } from '@/services/realtimeService';
import { useNavigate } from 'react-router-dom';
import { getMe, login as apiLogin, register as apiRegister, endSession } from '@/services/authService';

/**
 * Global authentication state: the current user, plus login/logout/register.
 *
 * The user is cached in tab-specific storage so a refresh doesn't blank the UI while
 * the /auth/me revalidation is in flight. The api.js response interceptor
 * handles 401s by clearing storage and redirecting.
 */
export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    return readCachedUser();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const mounted = useRef(false);

  const refreshUser = useCallback(async () => {
    const token = authStorage.getItem('trace_token');
    if (!token) return null;
    const version = ++revision.current;
    const data = await getMe();
    if (!mounted.current || revision.current !== version || authStorage.getItem('trace_token') !== token) return null;
    const fresh = data.user || data;
    authStorage.setItem('trace_user', JSON.stringify(fresh));
    setUser(fresh);
    window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: fresh }));
    return fresh;
  }, []);
  useDataRefresh(['accounts', 'profile'], refreshUser, Boolean(user));

  useEffect(() => {
    mounted.current = true;
    let active = true;
    if (authStorage.getItem('trace_token')) {
      refreshUser().catch(() => { /* Interceptor handles expired sessions. */ })
        .finally(() => { if (active) setLoading(false); });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
    return () => { active = false; mounted.current = false; revision.current += 1; };
  }, [refreshUser]);

  useEffect(() => {
    const sync = (event) => setUser(current => ({ ...current, ...event.detail }));
    window.addEventListener('trace-user-updated', sync);
    return () => window.removeEventListener('trace-user-updated', sync);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(credentials);
      if (data.requires_2fa || data.requires_authenticator_setup) return data;
      disconnectRealtime();
      authStorage.setItem('trace_token', data.token);
      if (data.user) {
        authStorage.setItem('trace_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      navigate('/dashboard');
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Authentication failed. Please try again.');
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = authStorage.getItem('trace_token');
      await endSession();
      if (authStorage.getItem('trace_token') !== token) return true;
      disconnectRealtime();
      authStorage.removeItem('trace_token');
      authStorage.removeItem('trace_user');
      setUser(null);
      navigate('/');
      return true;
    } catch {
      setError('Could not confirm logout. Retry while connected to end this session.');
      return false;
    } finally { setLoading(false); }
  };

  const register = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRegister(credentials);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Patch the cached user after a profile change (e.g. clearing
   * `must_change_password` once the user has chosen their own password), so the
   * UI updates without a round-trip or a reload.
   */
  const updateCachedUser = (patch) => {
    setUser((current) => {
      const next = { ...current, ...patch };
      authStorage.setItem('trace_user', JSON.stringify(next));
      return next;
    });
  };

  return { user, loading, error, login, logout, register, updateCachedUser, refreshUser };
}

export default useAuth;
