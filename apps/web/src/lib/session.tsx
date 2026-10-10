'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, Role } from '@dealer/shared';
import { api, isApiError } from '@/lib/api';

export type Session =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error' }
  | { status: 'authenticated'; user: AuthUser };

interface SessionApi {
  session: Session;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Called when the API says the session is gone (after the client's own refresh attempt failed). */
  expire: () => void;
  retry: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((user) => !cancelled && setSession({ status: 'authenticated', user }))
      .catch(
        (e) =>
          !cancelled &&
          setSession({ status: isApiError(e) && e.isUnauthorized ? 'anonymous' : 'error' }),
      );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await api.auth.login(email, password);
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined); // the cookie is cleared server-side; local state resets regardless
    setSession({ status: 'anonymous' });
  }, []);

  const value = useMemo<SessionApi>(
    () => ({
      session,
      login,
      logout,
      expire: () => setSession({ status: 'anonymous' }),
      retry: () => {
        setSession({ status: 'loading' });
        setAttempt((n) => n + 1);
      },
    }),
    [session, login, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export const useSessionOptional = (): SessionApi | null => useContext(SessionContext);

/** Convenience for pages that are only rendered for authenticated users. */
export function useUser(): AuthUser {
  const { session } = useSession();
  if (session.status !== 'authenticated')
    throw new Error('useUser called without an authenticated session');
  return session.user;
}

/** UI hints only. The API enforces the same rules in guards. */
export const canManageVehicles = (role: Role): boolean => role === 'ADMIN';
export const canWorkLeads = (role: Role): boolean => role === 'ADMIN' || role === 'SALES';
