"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { authApi } from "@/lib/api/auth";
import { refreshAccessToken } from "@/lib/api/client";

/**
 * Bootstraps the session on load: the HttpOnly refresh cookie (if any)
 * survives a reload, so we silently refresh -> fetch /auth/me before
 * rendering anything protected. Never flashes protected content while
 * that's in flight. Readiness is derived straight from the auth store's
 * own status rather than a mirrored local flag.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const setStatus = useAuthStore((s) => s.setStatus);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (useAuthStore.getState().status !== "idle") return;
    setStatus("loading");
    (async () => {
      try {
        const accessToken = await refreshAccessToken();
        const user = await authApi.me();
        setSession(accessToken, user);
      } catch {
        clear();
      }
    })();
  }, [setStatus, setSession, clear]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  return {
    user,
    status,
    isAuthenticated: status === "authenticated" && !!user,
    login: async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      setSession(result.accessToken, result.user);
      return result.user;
    },
    logout: async () => {
      try {
        await authApi.logout();
      } finally {
        clear();
        router.replace("/login");
      }
    },
  };
}
