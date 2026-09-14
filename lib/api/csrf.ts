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
 */
export async function readCsrfToken(): Promise<string | null> {
  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "/auth/csrf-bridge";

    const cleanup = () => {
      iframe.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    iframe.onload = () => {
      clearTimeout(timeout);
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
