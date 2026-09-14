import { useCallback, useState } from "react";

/**
 * One Idempotency-Key per logical submit attempt. The key stays stable
 * across re-renders and network retries of the SAME attempt (so a retried
 * request after a flaky network is recognized as the same operation by the
 * backend); call `renew()` only after a confirmed success or when the user
 * explicitly starts a new operation, never on every render.
 */
export function useIdempotencyKey() {
  const [key, setKey] = useState<string>(() => crypto.randomUUID());

  const renew = useCallback(() => {
    setKey(crypto.randomUUID());
  }, []);

  return { key, renew };
}
