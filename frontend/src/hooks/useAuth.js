import { useState, useEffect } from 'react';
import { disconnectRealtime } from '@/services/realtimeService';
import { useNavigate } from 'react-router-dom';
import { getMe, login as apiLogin, register as apiRegister, endSession } from '@/services/authService';

/**
 * Global authentication state: the current user, plus login/logout/register.
 *
 * The user is cached in localStorage so a refresh doesn't blank the UI while
 * the /auth/me revalidation is in flight. The api.js response interceptor
 * handles 401s by clearing storage and redirecting.
 */
export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('trace_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        const userData = data.user || data;
        setUser(userData);
        localStorage.setItem('trace_user', JSON.stringify(userData));
      } catch {
        // Interceptor handles 401 and clears storage
      } finally {
        setLoading(false);
      }
    };

    if (localStorage.getItem('trace_token')) {
      fetchUser();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, []);

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
      if (data.requires_2fa) return data;
      localStorage.setItem('trace_token', data.token);
      if (data.user) {
        localStorage.setItem('trace_user', JSON.stringify(data.user));
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
      await endSession();
      disconnectRealtime();
      localStorage.removeItem('trace_token');
      localStorage.removeItem('trace_user');
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
      localStorage.setItem('trace_user', JSON.stringify(next));
      return next;
    });
  };

  const refreshUser = async () => {
    const { user: fresh } = await getMe();
    localStorage.setItem('trace_user', JSON.stringify(fresh));
    window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: fresh }));
    return fresh;
  };

  return { user, loading, error, login, logout, register, updateCachedUser, refreshUser };
}

export default useAuth;
