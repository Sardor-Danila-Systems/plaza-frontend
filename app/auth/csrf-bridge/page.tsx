export default function CsrfBridgePage() {
  // Intentionally blank. Exists only because the backend's csrf_token
  // cookie is scoped `Path=/auth` (see plaza-api auth.constants.ts),
  // which document.cookie only exposes to a page whose own path starts
  // with /auth — see lib/api/csrf.ts for why this route exists.
  return null;
}
