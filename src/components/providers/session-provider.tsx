"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, phpApi, type SessionUser } from "@/lib/php-api";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<SessionUser | null>;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  adminLogin: (identifier: string, password: string) => Promise<SessionUser>;
  register: (input: {
    full_name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
  }) => Promise<SessionUser>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await phpApi.currentUser();
      setUser(result.user);
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    phpApi.currentUser().then((result) => {
      if (!active) return;
      setUser(result.user);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) setUser(null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      isAdmin: Boolean(user?.roles.some((role) => role === "admin" || role === "super_admin")),
      refresh,
      login: async (identifier, password) => {
        const result = await phpApi.login(identifier, password);
        setUser(result.user);
        return result.user;
      },
      adminLogin: async (identifier, password) => {
        const result = await phpApi.adminLogin(identifier, password);
        setUser(result.user);
        return result.user;
      },
      register: async (input) => {
        const result = await phpApi.register(input);
        setUser(result.user);
        return result.user;
      },
      logout: async () => {
        try {
          await phpApi.logout();
        } finally {
          setUser(null);
        }
      },
    }),
    [loading, refresh, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
