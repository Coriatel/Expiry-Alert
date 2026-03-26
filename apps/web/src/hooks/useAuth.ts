import { useCallback, useEffect, useState } from 'react';
import { fetchMe, logout, type AuthUser } from '@/lib/auth';
import { AUTH_EXPIRED_EVENT } from '@/lib/http';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Failed to log out cleanly', err);
    } finally {
      window.localStorage.removeItem('expiry-alert.preferredTeamId');
      setError(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setError(null);
      setLoading(false);
      setUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const hasPendingJoinRequest = Boolean(user?.pending_join_request);
  const teamApproved = user?.team_approved !== false;
  const needsTeam =
    !hasPendingJoinRequest &&
    (user?.needsTeam === true || (!user?.team_id && user?.id != null));
  const isSuspended = user?.membership_status === 'suspended';

  return {
    user,
    loading,
    error,
    refresh,
    signOut,
    setUser,
    teamApproved,
    needsTeam,
    isSuspended,
    hasPendingJoinRequest,
  };
}
