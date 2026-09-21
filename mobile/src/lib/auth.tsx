import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api } from './api';
import type { RegisterPayload, User } from './types';

type AuthState = {
  user: User | null;
  loading: boolean;
  /** True after login returns a two-factor challenge. */
  needsCode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const reload = async () => {
    try {
      const me = await api.get<User>('/api/v1/me/');
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    // Restore the session from the stored access token; a network failure
    // or an expired/unknown token simply falls back to logged-out.
    void reload().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      needsCode: pendingEmail !== null,
      login: async (email: string, password: string) => {
        const body = await api.post<{
          access?: string;
          refresh?: string;
          two_factor_required?: boolean;
        }>('/api/v1/auth/login/', { email, password });
        if (body.two_factor_required) {
          setPendingEmail(email);
          return;
        }
        await api.setTokens(body.access as string, body.refresh as string);
        await reload();
      },
      loginWithCode: async (code: string) => {
        if (!pendingEmail) throw new Error('No pending sign-in.');
        const pair = await api.post<{ access: string; refresh: string }>(
          '/api/v1/auth/login/2fa/',
          { email: pendingEmail, code },
        );
        await api.setTokens(pair.access, pair.refresh);
        setPendingEmail(null);
        await reload();
      },
      register: async (payload: RegisterPayload) => {
        await api.post('/api/v1/auth/register/', payload);
      },
      logout: async () => {
        // Best effort: tell the server to blacklist the refresh token, then
        // clear local state regardless. Logout succeeds from the client's
        // perspective even if the request fails (offline, expired token).
        try {
          const refresh = await api.getRefreshToken();
          await api.post('/api/v1/auth/logout/', { refresh });
        } catch {
          /* fall through to local cleanup */
        } finally {
          await api.clearTokens();
          setUser(null);
        }
      },
      reload,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, pendingEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
