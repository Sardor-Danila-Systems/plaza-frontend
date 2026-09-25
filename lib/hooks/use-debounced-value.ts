import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, so a search box drives one request after the
 * typing stops instead of one per keystroke. The first value is returned
 * immediately — only later changes wait.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
