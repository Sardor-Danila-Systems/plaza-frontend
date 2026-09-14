import { useAuthStore } from "@/lib/auth/store";
import { readCsrfToken } from "@/lib/api/csrf";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(statusCode: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Internal: skip the 401-refresh-retry dance (used by refresh itself). */
  skipAuthRetry?: boolean;
  /** e.g. CSRF for /auth/logout — see auth.ts. */
  csrf?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseErrorBody(response: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  let message = response.statusText || "Request failed";
  let requestId: string | undefined;
  try {
    const data = (await response.json()) as {
      code?: string;
      message?: string | string[];
      requestId?: string;
    };
    if (data.code) code = data.code;
    if (data.message) message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    requestId = data.requestId;
  } catch {
    // non-JSON error body — keep defaults
  }
  return new ApiError(response.status, code, message, requestId);
}

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrfToken = await readCsrfToken();
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
      if (!response.ok) {
        throw await parseErrorBody(response);
      }
      const data = (await response.json()) as { accessToken: string };
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, signal, skipAuthRetry, csrf } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (csrf) {
    const csrfToken = await readCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 401 && !skipAuthRetry && path !== "/auth/login") {
    try {
      await refreshAccessToken();
    } catch {
      useAuthStore.getState().clear();
      // Plain lib module, no router available outside a component — a full
      // navigation is also correct here since the whole session is gone.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "UNAUTHENTICATED", "Сессия истекла");
    }
    return apiFetch<T>(path, { ...options, skipAuthRetry: true });
  }

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
