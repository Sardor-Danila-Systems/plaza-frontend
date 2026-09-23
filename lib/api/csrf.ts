/**
 * Reads the `csrf_token` cookie the backend sets on login/refresh.
 *
 * Confirmed integration blocker (not a guess): the backend sets that
 * cookie with `Path=/auth` (plaza-api/src/modules/auth/auth.constants.ts,
 * AUTH_COOKIE_PATH), so `document.cookie` never exposes it to any page
 * outside that path — verified empirically: `document.cookie` is `""` on
 * every app route (/dashboard, /finance/new, etc.), which breaks
 * /auth/refresh and /auth/logout entirely, since both require the value
 * echoed back as `X-CSRF-Token` (double-submit pattern).
 *
 * Workaround, no backend change: cookies in browsers are scoped by
 * (host, path) with the port ignored entirely (RFC 6265) and no `Domain`
 * attribute was set, so a page whose own path starts with `/auth` on this
 * SAME frontend origin (regardless of port) DOES see the cookie — verified
 * empirically via a hidden same-origin iframe navigated to
 * `/auth/csrf-bridge` (a blank page that exists solely for this). This
 * reads the real cookie value; it does not touch the backend contract.
 *
 * Re-verified against the final (Phase 13) backend: `AUTH_COOKIE_PATH` is
 * still `/auth`, and its own doc comment now states explicitly that this is
 * deliberate — "neither cookie is ever sent on ordinary business API
 * requests." This bridge remains required.
 */
function loadCsrfBridge(): Promise<string | null> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "/auth/csrf-bridge";

    const cleanup = () => {
      iframe.remove();
    };

    iframe.onload = () => {
      try {
        const cookie = iframe.contentDocument?.cookie ?? "";
        const match = cookie.match(/(?:^|; )csrf_token=([^;]*)/);
        resolve(match ? decodeURIComponent(match[1]) : null);
      } catch {
        resolve(null);
      } finally {
        cleanup();
      }
    };

    document.body.appendChild(iframe);
  });
}

/**
 * Wrapped in a hard `Promise.race` against an independent timeout: relying
 * solely on `loadCsrfBridge`'s own internal `setTimeout`/`onload` sequencing
 * left a real gap where, if `onload` never fired and the internal timeout
 * didn't fire either (e.g. background-tab timer throttling), this promise
 * never settled — which left `AuthProvider`'s bootstrap stuck on
 * "Загрузка…" forever on first load. This guarantees a resolution no matter
 * what the bridge iframe does.
 */
export async function readCsrfToken(): Promise<string | null> {
  if (typeof document === "undefined") return null;

  return Promise.race([
    loadCsrfBridge(),
    new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}
