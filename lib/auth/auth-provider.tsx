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
        // Hard upper bound on the whole bootstrap chain: without this, if
        // refreshAccessToken()/me() ever hangs (network stall, a promise
        // that never settles upstream), `status` stays "loading" forever
        // and the app shows "Загрузка…" indefinitely with no way out short
        // of a hard refresh.
        const bootstrap = (async () => {
          const accessToken = await refreshAccessToken();
          const user = await authApi.me();
          setSession(accessToken, user);
        })();
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("auth bootstrap timed out")), 8000);
        });
        await Promise.race([bootstrap, timeout]);
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
  const setUser = useAuthStore((s) => s.setUser);
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
    updateProfile: async (displayName: string) => {
      const updated = await authApi.updateMe(displayName);
      setUser(updated);
      return updated;
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      authApi.changePassword(currentPassword, newPassword),
  };
}
