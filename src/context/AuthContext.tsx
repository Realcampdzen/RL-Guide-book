import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserRole } from '../types/authRole';
import { canUseChat as canUseChatByRole } from '../types/authRole';
import { loadAuthStorage, saveAuthStorage, clearAuthStorage, setOn401, type AuthStorage } from '../utils/authStorage';

interface AuthContextType {
  role: UserRole;
  deviceId: string;
  accessToken: string | undefined;
  campId: string | undefined;
  canUseChat: boolean;
  setRole: (role: UserRole) => void;
  setAuth: (data: { role: UserRole; accessToken?: string; campId?: string; exp?: number }) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthStorage>(() => loadAuthStorage());

  useEffect(() => {
    setAuthState(loadAuthStorage());
  }, []);

  const setRole = useCallback((role: UserRole) => {
    // Role switch in sandbox should not keep old JWT from another role.
    saveAuthStorage({ role, accessToken: undefined, campId: undefined, exp: undefined });
    setAuthState(loadAuthStorage());
  }, []);

  const setAuth = useCallback((data: { role: UserRole; accessToken?: string; campId?: string; exp?: number }) => {
    saveAuthStorage(data);
    setAuthState(loadAuthStorage());
  }, []);

  const clearAuth = useCallback(() => {
    clearAuthStorage();
    setAuthState(loadAuthStorage());
  }, []);

  useEffect(() => {
    setOn401(clearAuth);
    return () => setOn401(null);
  }, [clearAuth]);

  const canUseChat = canUseChatByRole(auth.role);

  const value: AuthContextType = {
    role: auth.role,
    deviceId: auth.deviceId,
    accessToken: auth.accessToken,
    campId: auth.campId,
    canUseChat,
    setRole,
    setAuth,
    clearAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
