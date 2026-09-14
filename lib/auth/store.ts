import { create } from "zustand";
import type { SafeUser } from "@/lib/api/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  user: SafeUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: SafeUser) => void;
  setAccessToken: (accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

/** In-memory only — never localStorage, so an XSS payload can't read a
 * long-lived token off disk. Session survives reload via the HttpOnly
 * refresh cookie (see AuthProvider's bootstrap). */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "idle",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
}));
