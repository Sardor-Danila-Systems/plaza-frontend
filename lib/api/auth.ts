import { apiFetch } from "@/lib/api/client";
import type { LoginResponse, SafeUser } from "@/lib/api/types";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuthRetry: true,
    }),

  me: () => apiFetch<SafeUser>("/auth/me"),

  logout: () =>
    apiFetch<void>("/auth/logout", {
      method: "POST",
      skipAuthRetry: true,
      csrf: true,
    }),
};
